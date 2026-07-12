require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");
const AdmZip = require("adm-zip");
const Database = require("better-sqlite3");
const { v4: uuid } = require("uuid");

const db = require("./database");
const { checkAdminPassword, checkWebAppInitData, createAdminSession, requireAdmin, upsertUser } = require("./auth");
const { notifyAdmin, notifyCustomer } = require("./bot");
const { databasePath, uploadsDir, uploadTypes, uploadPath, safeJoin, ensureStorage } = require("./storage");

const app = express();
const allowedUploadTypes = uploadTypes;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath(req.query.type).dir),
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname) || ".jpg"}`),
});
const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const allowedImageExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowedImageMimeTypes.has(file.mimetype) || !allowedImageExts.has(ext)) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const restoreUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 128 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowedTypes = new Set(["application/zip", "application/x-zip-compressed", "multipart/x-zip", "application/octet-stream"]);
    if (ext !== ".zip" || (file.mimetype && !allowedTypes.has(file.mimetype))) {
      cb(new Error("Only ZIP backups are allowed"));
      return;
    }
    cb(null, true);
  },
});

function rowToProduct(row) {
  return {
    ...row,
    is_weekly_discount: Boolean(row.is_weekly_discount),
    is_available: Boolean(row.is_available),
    is_draft: Boolean(row.is_draft),
  };
}

function settingsObject() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/admin/login", (req, res) => {
  const { login = "", password = "" } = req.body || {};
  if (!checkAdminPassword(login, password)) {
    return res.status(401).json({ error: "Invalid login or password" });
  }
  res.json({ token: createAdminSession(login), user: { login } });
});

app.get("/api/me", requireAdmin, (req, res) => res.json({ ok: true, admin: req.admin }));

app.post("/api/upload", requireAdmin, (req, res) => {
  upload.single("file")(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message || "Upload failed" });
    if (!req.file) return res.status(400).json({ error: "Файл не получен" });
    const { cleanType } = uploadPath(req.query.type);
  res.json({ url: `/uploads/${cleanType}/${req.file.filename}` });
  });
});

function normalizeZipName(name) {
  const clean = String(name || "").replace(/\\/g, "/");
  if (!clean || clean.startsWith("/") || /^[a-zA-Z]:\//.test(clean)) throw new Error("Invalid ZIP entry");
  const normalized = path.posix.normalize(clean);
  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) throw new Error("Invalid ZIP entry");
  return normalized;
}

function isAllowedUploadEntry(name) {
  const normalized = normalizeZipName(name);
  return uploadTypes.some((type) => normalized === `uploads/${type}` || normalized.startsWith(`uploads/${type}/`));
}

function addDirectoryToZip(zip, sourceDir, zipPrefix) {
  if (!fs.existsSync(sourceDir)) return;
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const zipName = `${zipPrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      addDirectoryToZip(zip, source, zipName);
    } else if (entry.isFile()) {
      zip.addLocalFile(source, path.posix.dirname(zipName), path.posix.basename(zipName));
    }
  }
}

function validateRestoredDatabase(filePath) {
  const restored = new Database(filePath, { readonly: true, fileMustExist: true });
  try {
    const integrity = restored.prepare("PRAGMA integrity_check").get();
    if (!integrity || integrity.integrity_check !== "ok") throw new Error("Database integrity check failed");
    const tables = ["categories", "products", "orders", "settings"];
    for (const table of tables) {
      const found = restored.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
      if (!found) throw new Error(`Database table is missing: ${table}`);
    }
  } finally {
    restored.close();
  }
}

function replaceDatabase(restoredPath) {
  validateRestoredDatabase(restoredPath);
  const liveDb = db.getDb();
  if (liveDb?.open) liveDb.close();
  for (const suffix of ["", "-wal", "-shm"]) {
    const file = `${databasePath}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file, { force: true });
  }
  fs.copyFileSync(restoredPath, databasePath);
  db.reconnect();
}

function clearUploads() {
  ensureStorage();
  for (const type of uploadTypes) {
    const dir = uploadPath(type).dir;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }
}

function restoreUploadsFrom(extractRoot) {
  const sourceUploads = path.join(extractRoot, "uploads");
  if (!fs.existsSync(sourceUploads)) return;
  clearUploads();
  for (const type of uploadTypes) {
    const source = path.join(sourceUploads, type);
    const target = uploadPath(type).dir;
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, target, {
      recursive: true,
      errorOnExist: false,
      filter: (sourcePath) => {
        const rel = path.relative(source, sourcePath);
        if (!rel) return true;
        safeJoin(target, rel);
        return true;
      },
    });
  }
}

function readJsonIfExists(root, fileName) {
  const file = path.join(root, fileName);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function importLegacyAssets(root, value) {
  if (!value || typeof value !== "string") return value || "";
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized.startsWith("uploads/") || !isAllowedUploadEntry(normalized)) return value;
  const source = path.join(root, normalized);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) return value;
  const target = safeJoin(path.dirname(uploadsDir), normalized);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) fs.copyFileSync(source, target);
  return `/${normalized}`;
}

function importLegacyData(root) {
  const legacyCategories = readJsonIfExists(root, "categories.json");
  const legacyProducts = readJsonIfExists(root, "products.json");
  const legacySettings = readJsonIfExists(root, "settings.json");
  const imported = { categories: 0, products: 0, settings: 0 };

  if (legacySettings && typeof legacySettings === "object") {
    const upsert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    for (const [key, value] of Object.entries(legacySettings)) {
      upsert.run(key, String(importLegacyAssets(root, value) ?? ""));
      imported.settings += 1;
    }
  }

  if (Array.isArray(legacyCategories)) {
    const insert = db.prepare("INSERT INTO categories (name, description, image, sort_order) VALUES (?, ?, ?, ?)");
    const update = db.prepare("UPDATE categories SET description = ?, image = ?, sort_order = ? WHERE id = ?");
    for (const item of legacyCategories) {
      if (!item?.name) continue;
      const image = importLegacyAssets(root, item.image);
      const existing = db.prepare("SELECT * FROM categories WHERE lower(name) = lower(?)").get(item.name);
      if (existing) update.run(item.description || "", image || "", Number(item.sort_order) || 0, existing.id);
      else insert.run(item.name, item.description || "", image || "", Number(item.sort_order) || 0);
      imported.categories += 1;
    }
  }

  if (Array.isArray(legacyProducts)) {
    const insert = db.prepare(
      `INSERT INTO products
       (category_id, title, description, price, old_price, image, is_weekly_discount, is_available, is_draft, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const update = db.prepare(
      `UPDATE products SET category_id = ?, description = ?, price = ?, old_price = ?, image = ?,
       is_weekly_discount = ?, is_available = ?, is_draft = ?, sort_order = ?, updated_at = datetime('now')
       WHERE id = ?`
    );
    for (const item of legacyProducts) {
      if (!item?.title) continue;
      let categoryId = item.category_id || null;
      if (item.category_name) {
        const category = db.prepare("SELECT id FROM categories WHERE lower(name) = lower(?)").get(item.category_name);
        categoryId = category?.id || categoryId;
      }
      const image = importLegacyAssets(root, item.image);
      const existing = db.prepare("SELECT * FROM products WHERE lower(title) = lower(?) AND COALESCE(category_id, 0) = COALESCE(?, 0)").get(item.title, categoryId);
      const oldPrice = item.old_price === "" || item.old_price == null ? null : Number(item.old_price);
      const values = [
        categoryId,
        item.description || "",
        Number(item.price) || 0,
        oldPrice,
        image || "",
        item.is_weekly_discount ? 1 : 0,
        item.is_available === false ? 0 : 1,
        item.is_draft ? 1 : 0,
        Number(item.sort_order) || 0,
      ];
      if (existing) update.run(...values, existing.id);
      else insert.run(categoryId, item.title, item.description || "", Number(item.price) || 0, oldPrice, image || "", item.is_weekly_discount ? 1 : 0, item.is_available === false ? 0 : 1, item.is_draft ? 1 : 0, Number(item.sort_order) || 0);
      imported.products += 1;
    }
  }

  return imported;
}

function extractValidatedBackup(buffer) {
  const zip = new AdmZip(buffer);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "f1-shop-restore-"));
  let hasKnownContent = false;
  for (const entry of zip.getEntries()) {
    const name = normalizeZipName(entry.entryName);
    const isAllowed =
      name === "database.db" ||
      name === "manifest.json" ||
      name === "products.json" ||
      name === "categories.json" ||
      name === "settings.json" ||
      isAllowedUploadEntry(name);
    if (!isAllowed) throw new Error(`Unsupported backup entry: ${name}`);
    if (entry.isDirectory) continue;
    hasKnownContent = true;
    const target = safeJoin(tempRoot, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.getData());
  }
  if (!hasKnownContent) throw new Error("Backup archive is empty");
  return tempRoot;
}

app.get("/api/admin/backup", requireAdmin, async (req, res) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "f1-shop-backup-"));
  const backupDbPath = path.join(tempDir, "database.db");
  try {
    await db.backup(backupDbPath);
    const zip = new AdmZip();
    zip.addLocalFile(backupDbPath, "", "database.db");
    addDirectoryToZip(zip, uploadsDir, "uploads");
    zip.addFile("manifest.json", Buffer.from(JSON.stringify({
      app: "F1 Constructor Shop",
      created_at: new Date().toISOString(),
      contains: ["database.db", "uploads"],
    }, null, 2)));
    const data = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="f1-shop-backup-${Date.now()}.zip"`);
    res.send(data);
  } catch (error) {
    res.status(500).json({ error: error.message || "Backup failed" });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

app.post("/api/admin/restore", requireAdmin, (req, res) => {
  restoreUpload.single("file")(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message || "Restore upload failed" });
    if (!req.file) return res.status(400).json({ error: "ZIP file is required" });
    let tempRoot = "";
    try {
      tempRoot = extractValidatedBackup(req.file.buffer);
      const restoredDb = path.join(tempRoot, "database.db");
      if (fs.existsSync(restoredDb)) replaceDatabase(restoredDb);
      restoreUploadsFrom(tempRoot);
      const imported = importLegacyData(tempRoot);
      res.json({ ok: true, imported });
    } catch (restoreError) {
      res.status(400).json({ error: restoreError.message || "Restore failed" });
    } finally {
      if (tempRoot) fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

app.get("/api/categories", (req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY sort_order, id").all());
});

app.post("/api/categories", requireAdmin, (req, res) => {
  const { name, description = "", image = "", sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: "Название обязательно" });
  const info = db.prepare(
    "INSERT INTO categories (name, description, image, sort_order) VALUES (?, ?, ?, ?)"
  ).run(name, description, image, Number(sort_order) || 0);
  res.json(db.prepare("SELECT * FROM categories WHERE id = ?").get(info.lastInsertRowid));
});

app.put("/api/categories/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Категория не найдена" });
  const next = { ...existing, ...req.body };
  db.prepare("UPDATE categories SET name = ?, description = ?, image = ?, sort_order = ? WHERE id = ?")
    .run(next.name, next.description || "", next.image || "", Number(next.sort_order) || 0, req.params.id);
  res.json(db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id));
});

app.delete("/api/categories/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

function sendProducts(req, res) {
  const params = [];
  let sql = "SELECT * FROM products WHERE 1=1";
  if (req.query.category_id) {
    sql += " AND category_id = ?";
    params.push(req.query.category_id);
  }
  if (req.query.weekly === "1") sql += " AND is_weekly_discount = 1";
  if (req.query.admin !== "1") sql += " AND is_available = 1 AND is_draft = 0";
  sql += " ORDER BY sort_order, id DESC";
  res.json(db.prepare(sql).all(...params).map(rowToProduct));
}

app.get("/api/products", (req, res) => {
  if (req.query.admin === "1") {
    return requireAdmin(req, res, () => sendProducts(req, res));
  }
  return sendProducts(req, res);
});

app.get("/api/products/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Товар не найден" });
  if (row.is_draft || !row.is_available) {
    return requireAdmin(req, res, () => res.json(rowToProduct(row)));
  }
  res.json(rowToProduct(row));
});

app.post("/api/products", requireAdmin, (req, res) => {
  const p = req.body;
  if (!p.title || p.price == null) return res.status(400).json({ error: "Название и цена обязательны" });
  const info = db.prepare(
    `INSERT INTO products
     (category_id, title, description, price, old_price, image, is_weekly_discount, is_available, is_draft, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    p.category_id || null,
    p.title,
    p.description || "",
    Number(p.price),
    p.old_price === "" || p.old_price == null ? null : Number(p.old_price),
    p.image || "",
    p.is_weekly_discount ? 1 : 0,
    p.is_available ? 1 : 0,
    p.is_draft ? 1 : 0,
    Number(p.sort_order) || 0
  );
  res.json(rowToProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid)));
});

app.put("/api/products/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Товар не найден" });
  const p = { ...existing, ...req.body };
  db.prepare(
    `UPDATE products SET category_id = ?, title = ?, description = ?, price = ?, old_price = ?,
     image = ?, is_weekly_discount = ?, is_available = ?, is_draft = ?, sort_order = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    p.category_id || null,
    p.title,
    p.description || "",
    Number(p.price),
    p.old_price === "" || p.old_price == null ? null : Number(p.old_price),
    p.image || "",
    p.is_weekly_discount ? 1 : 0,
    p.is_available ? 1 : 0,
    p.is_draft ? 1 : 0,
    Number(p.sort_order) || 0,
    req.params.id
  );
  res.json(rowToProduct(db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id)));
});

app.delete("/api/products/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/orders", (req, res) => {
  const { initData = "", telegram_user = {}, customer_name, username = "", phone, address, comment = "", items = [] } = req.body;
  if (process.env.BOT_TOKEN && initData && !checkWebAppInitData(initData, process.env.BOT_TOKEN)) {
    return res.status(403).json({ error: "Не удалось подтвердить Telegram Mini App" });
  }
  if (!customer_name || !phone || !address || !items.length) {
    return res.status(400).json({ error: "Заполните обязательные поля заказа" });
  }
  if (telegram_user.id) upsertUser(telegram_user, 0);
  const normalized = items.map((item) => {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id);
    return {
      product_id: item.product_id,
      title: product?.title || item.title || "Товар",
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: Number(product?.price ?? item.price ?? 0),
    };
  });
  const total = normalized.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tx = db.transaction(() => {
    const order = db.prepare(
      `INSERT INTO orders (telegram_id, customer_name, username, phone, address, comment, status, total_price)
       VALUES (?, ?, ?, ?, ?, ?, 'awaiting_confirmation', ?)`
    ).run(String(telegram_user.id || ""), customer_name, username || telegram_user.username || "", phone, address, comment, total);
    const insertItem = db.prepare(
      "INSERT INTO order_items (order_id, product_id, title, quantity, price) VALUES (?, ?, ?, ?, ?)"
    );
    normalized.forEach((item) => insertItem.run(order.lastInsertRowid, item.product_id, item.title, item.quantity, item.price));
    return order.lastInsertRowid;
  });
  const id = tx();
  notifyAdmin(`Новый заказ #${id}\nКлиент: ${customer_name}\nТелефон: ${phone}\nСумма: ${total} ₽\nСтатус: ожидает подтверждения`);
  res.json({ id, total_price: total, status: "awaiting_confirmation" });
});

function orderWithItems(order) {
  return { ...order, items: db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id) };
}

app.get("/api/orders", requireAdmin, (req, res) => {
  res.json(db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all().map(orderWithItems));
});

app.get("/api/orders/:id", requireAdmin, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "Заказ не найден" });
  res.json(orderWithItems(order));
});

const statusMessages = {
  paid: (o) => `Оплата по заказу #${o.id} подтверждена. Заказ принят в работу.`,
  shipped: (o) => `Заказ #${o.id} отправлен.${o.track_number ? `\nТрек-номер: ${o.track_number}` : ""}`,
  completed: (o) => `Заказ #${o.id} завершен. Спасибо за покупку.`,
  cancelled: (o) => `Заказ #${o.id} отменен. Свяжитесь с менеджером, если это ошибка.`,
};

app.patch("/api/orders/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Заказ не найден" });
  const status = req.body.status || existing.status;
  const track = req.body.track_number ?? existing.track_number;
  db.prepare("UPDATE orders SET status = ?, track_number = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, track, req.params.id);
  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (statusMessages[status] && updated.telegram_id) notifyCustomer(updated.telegram_id, statusMessages[status](updated));
  res.json(orderWithItems(updated));
});

app.get("/api/settings", (req, res) => res.json(settingsObject()));

app.put("/api/settings", requireAdmin, (req, res) => {
  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  for (const [key, value] of Object.entries(req.body)) upsert.run(key, String(value ?? ""));
  res.json(settingsObject());
});

app.get("/api/stats", requireAdmin, (req, res) => {
  res.json({
    ordersToday: db.prepare("SELECT COUNT(*) c FROM orders WHERE date(created_at) = date('now')").get().c,
    revenue: db.prepare("SELECT COALESCE(SUM(total_price), 0) s FROM orders WHERE status != 'cancelled'").get().s,
    totalOrders: db.prepare("SELECT COUNT(*) c FROM orders").get().c,
    totalProducts: db.prepare("SELECT COUNT(*) c FROM products").get().c,
  });
});

module.exports = app;
