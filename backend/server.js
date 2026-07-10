require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuid } = require("uuid");

const db = require("./database");
const { checkTelegramLogin, checkWebAppInitData, createSessionToken, requireAdmin, upsertUser } = require("./auth");
const { notifyAdmin, notifyCustomer } = require("./bot");

const app = express();
const uploadsDir = path.join(__dirname, "uploads");
const allowedUploadTypes = ["products", "categories", "banners", "qr", "logo"];

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDir));

function uploadPath(type) {
  const cleanType = allowedUploadTypes.includes(type) ? type : "products";
  const dir = path.join(uploadsDir, cleanType);
  fs.mkdirSync(dir, { recursive: true });
  return { dir, cleanType };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath(req.query.type).dir),
  filename: (req, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname) || ".jpg"}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

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

app.post("/api/login", (req, res) => {
  const user = req.body;
  if (!checkTelegramLogin(user, process.env.BOT_TOKEN)) {
    return res.status(403).json({ error: "Не удалось подтвердить Telegram" });
  }
  if (String(user.id) !== String(process.env.ADMIN_ID)) {
    return res.status(403).json({ error: "Доступ запрещен" });
  }
  upsertUser(user, 1);
  res.json({ token: createSessionToken(user), user: { id: user.id, username: user.username, first_name: user.first_name } });
});

app.get("/api/me", requireAdmin, (req, res) => res.json({ ok: true, admin: req.admin }));

app.post("/api/upload", requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не получен" });
  const { cleanType } = uploadPath(req.query.type);
  res.json({ url: `/uploads/${cleanType}/${req.file.filename}` });
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

app.get("/api/products", (req, res) => {
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
});

app.get("/api/products/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Товар не найден" });
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
