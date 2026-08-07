const UPLOAD_TYPES = new Set(["products", "categories", "banners", "qr", "logo"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const STATUS_MESSAGES = {
  awaiting_payment: (o) => `Спасибо за покупку.\n\nЗаказ #${o.id} рассчитан.\nТовары: ${o.items_price} ₽\nДоставка: ${o.delivery_price} ₽\nИтого: ${o.total_price} ₽\n\nОплата доступна по QR-коду или по ссылке ниже.\n\nПосле оплаты нажмите кнопку подтверждения оплаты.`,
  paid: (o) => `Оплата по заказу #${o.id} подтверждена. Заказ принят в работу.`,
  shipped: (o) => `Заказ #${o.id} отправлен.${o.track_number ? `\nТрек-номер: ${o.track_number}` : ""}`,
  completed: (o) => `Заказ #${o.id} завершен. Спасибо за покупку.`,
  cancelled: (o) => `Заказ #${o.id} отменен. Свяжитесь с менеджером, если это ошибка.`,
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return empty(request, env);
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/uploads/")) return getUpload(request, env);
      if (url.pathname === "/telegram/webhook" && request.method === "POST") return telegramWebhook(request, env);

      if (url.pathname === "/api/health" && request.method === "GET") return json(request, env, { ok: true, version: "cloudflare-2026-08-07.1" });
      if (url.pathname === "/api/admin/login" && request.method === "POST") return adminLogin(request, env);
      if (url.pathname === "/api/me" && request.method === "GET") return withAdmin(request, env, () => json(request, env, { ok: true, admin: { role: "admin" } }));
      if (url.pathname === "/api/upload" && request.method === "POST") return withAdmin(request, env, () => uploadFile(request, env));
      if (url.pathname === "/api/admin/setup-bot" && request.method === "POST") return withAdmin(request, env, () => setupBot(request, env));
      if (url.pathname === "/api/admin/backup" && request.method === "GET") return withAdmin(request, env, () => exportJson(request, env));
      if (url.pathname === "/api/admin/restore" && request.method === "POST") return withAdmin(request, env, () => restoreJsonFromForm(request, env));
      if (url.pathname === "/api/admin/export-json" && request.method === "GET") return withAdmin(request, env, () => exportJson(request, env));
      if (url.pathname === "/api/admin/import-json" && request.method === "POST") return withAdmin(request, env, () => importJson(request, env));

      if (url.pathname === "/api/settings" && request.method === "GET") return json(request, env, await settingsObject(env));
      if (url.pathname === "/api/settings" && request.method === "PUT") return withAdmin(request, env, () => updateSettings(request, env));
      if (url.pathname === "/api/stats" && request.method === "GET") return withAdmin(request, env, () => stats(request, env));

      const categoryId = matchId(url.pathname, "/api/categories");
      if (url.pathname === "/api/categories" && request.method === "GET") return listCategories(request, env);
      if (url.pathname === "/api/categories" && request.method === "POST") return withAdmin(request, env, () => createCategory(request, env));
      if (categoryId && request.method === "PUT") return withAdmin(request, env, () => updateCategory(request, env, categoryId));
      if (categoryId && request.method === "DELETE") return withAdmin(request, env, () => deleteCategory(request, env, categoryId));

      const subcategoryId = matchId(url.pathname, "/api/subcategories");
      if (url.pathname === "/api/subcategories" && request.method === "GET") return listSubcategories(request, env);
      if (url.pathname === "/api/subcategories" && request.method === "POST") return withAdmin(request, env, () => createSubcategory(request, env));
      if (subcategoryId && request.method === "PUT") return withAdmin(request, env, () => updateSubcategory(request, env, subcategoryId));
      if (subcategoryId && request.method === "DELETE") return withAdmin(request, env, () => deleteSubcategory(request, env, subcategoryId));

      const productId = matchId(url.pathname, "/api/products");
      if (url.pathname === "/api/products" && request.method === "GET") return listProducts(request, env);
      if (productId && request.method === "GET") return getProduct(request, env, productId);
      if (url.pathname === "/api/products" && request.method === "POST") return withAdmin(request, env, () => createProduct(request, env));
      if (productId && request.method === "PUT") return withAdmin(request, env, () => updateProduct(request, env, productId));
      if (productId && request.method === "DELETE") return withAdmin(request, env, () => deleteProduct(request, env, productId));

      const orderId = matchId(url.pathname, "/api/orders");
      if (url.pathname === "/api/orders" && request.method === "POST") return createOrder(request, env);
      if (url.pathname === "/api/orders" && request.method === "GET") return withAdmin(request, env, () => listOrders(request, env));
      if (orderId && request.method === "GET") return withAdmin(request, env, () => getOrder(request, env, orderId));
      if (orderId && request.method === "PATCH") return withAdmin(request, env, () => updateOrder(request, env, orderId));

      return json(request, env, { error: "Not found" }, 404);
    } catch (error) {
      return json(request, env, { error: error.message || "Server error" }, error.status || 500);
    }
  },
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "*";
  const allowed = env.FRONTEND_ORIGIN && env.FRONTEND_ORIGIN !== "*" ? env.FRONTEND_ORIGIN : origin;
  return {
    "Access-Control-Allow-Origin": allowed || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}

function empty(request, env) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

function json(request, env, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(request, env), ...extraHeaders },
  });
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

async function readJson(request) {
  return request.json().catch(() => ({}));
}

function matchId(pathname, base) {
  const match = pathname.match(new RegExp(`^${base}/(\\d+)$`));
  return match ? Number(match[1]) : null;
}

function bool(value) {
  return value ? 1 : 0;
}

function rowToProduct(row) {
  if (!row) return null;
  return {
    ...row,
    is_weekly_discount: Boolean(row.is_weekly_discount),
    is_available: Boolean(row.is_available),
    is_draft: Boolean(row.is_draft),
  };
}

async function settingsObject(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  return Object.fromEntries(results.map((row) => [row.key, row.value]));
}

async function upsertSettings(env, data) {
  const statements = Object.entries(data).map(([key, value]) =>
    env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, String(value ?? ""))
  );
  if (statements.length) await env.DB.batch(statements);
}

function normalizeTelegramUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "https://t.me/F1posters_bot";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("@")) return `https://t.me/${raw.slice(1)}`;
  if (raw.startsWith("t.me/")) return `https://${raw}`;
  return `https://t.me/${raw.replace(/^\/+/, "")}`;
}

function normalizeHttpUrl(value) {
  const raw = String(value || "").trim();
  return raw.startsWith("http://") || raw.startsWith("https://") ? raw : "";
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlText(text) {
  return base64Url(new TextEncoder().encode(text));
}

async function hmac(keyText, value, algorithm = "SHA-256") {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(keyText), { name: "HMAC", hash: algorithm }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, typeof value === "string" ? new TextEncoder().encode(value) : value));
}

async function hmacBytes(keyBytes, value, algorithm = "SHA-256") {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: algorithm }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, typeof value === "string" ? new TextEncoder().encode(value) : value));
}

function hex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function createToken(env, login) {
  const header = base64UrlText(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlText(JSON.stringify({
    role: "admin",
    login: String(login || "admin"),
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
  }));
  const signature = base64Url(await hmac(env.JWT_SECRET || "change-me", `${header}.${payload}`));
  return `${header}.${payload}.${signature}`;
}

async function verifyToken(env, token) {
  const [header, payload, signature] = String(token || "").split(".");
  if (!header || !payload || !signature) return null;
  const expected = base64Url(await hmac(env.JWT_SECRET || "change-me", `${header}.${payload}`));
  if (expected !== signature) return null;
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
  const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))));
  if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
  return data.role === "admin" ? data : null;
}

async function withAdmin(request, env, handler) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const admin = await verifyToken(env, token);
  if (!admin) return json(request, env, { error: "Unauthorized" }, 401);
  request.admin = admin;
  return handler();
}

async function adminLogin(request, env) {
  const body = await readJson(request);
  const login = String(body.login || "");
  const password = String(body.password || "");
  const expectedLogin = env.ADMIN_LOGIN || "";
  const expectedPassword = env.ADMIN_PASSWORD || "";
  const secret = env.ADMIN_SECRET || "";
  const ok = secret ? password === secret : Boolean(expectedLogin && expectedPassword && login === expectedLogin && password === expectedPassword);
  if (!ok) return json(request, env, { error: "Invalid login or password" }, 401);
  return json(request, env, { token: await createToken(env, login), user: { login: login || "admin" } });
}

async function checkWebAppInitData(initData, botToken) {
  if (!botToken || !initData) return false;
  const params = new URLSearchParams(initData);
  const hashValue = params.get("hash");
  params.delete("hash");
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = await hmac("WebAppData", botToken);
  const digest = hex(await hmacBytes(secret, checkString));
  return Boolean(hashValue && digest === hashValue);
}

async function upsertUser(env, user, isAdmin = 0) {
  if (!user?.id) return;
  await env.DB.prepare(
    `INSERT INTO users (telegram_id, username, first_name, last_name, is_admin)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET
       username = excluded.username,
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       is_admin = max(users.is_admin, excluded.is_admin)`
  ).bind(String(user.id), user.username || "", user.first_name || "", user.last_name || "", isAdmin ? 1 : 0).run();
}

async function listCategories(request, env) {
  const { results } = await env.DB.prepare("SELECT * FROM categories ORDER BY sort_order, id").all();
  return json(request, env, results);
}

async function createCategory(request, env) {
  const body = await readJson(request);
  if (!body.name) return json(request, env, { error: "Название обязательно" }, 400);
  const result = await env.DB.prepare(
    "INSERT INTO categories (name, description, image, sort_order) VALUES (?, ?, ?, ?)"
  ).bind(body.name, body.description || "", body.image || "", Number(body.sort_order) || 0).run();
  return json(request, env, { id: result.meta.last_row_id });
}

async function updateCategory(request, env, id) {
  const body = await readJson(request);
  const current = await env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(id).first();
  if (!current) return json(request, env, { error: "Категория не найдена" }, 404);
  await env.DB.prepare("UPDATE categories SET name = ?, description = ?, image = ?, sort_order = ? WHERE id = ?")
    .bind(body.name || current.name, body.description || "", body.image || "", Number(body.sort_order) || 0, id).run();
  return json(request, env, { ok: true });
}

async function deleteCategory(request, env, id) {
  await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  return json(request, env, { ok: true });
}

async function listSubcategories(request, env) {
  const url = new URL(request.url);
  let stmt = env.DB.prepare("SELECT * FROM subcategories ORDER BY sort_order, id");
  const categoryId = url.searchParams.get("category_id");
  if (categoryId) stmt = env.DB.prepare("SELECT * FROM subcategories WHERE category_id = ? ORDER BY sort_order, id").bind(categoryId);
  const { results } = await stmt.all();
  return json(request, env, results);
}

async function createSubcategory(request, env) {
  const body = await readJson(request);
  if (!body.category_id || !body.name) return json(request, env, { error: "Категория и название обязательны" }, 400);
  const result = await env.DB.prepare(
    "INSERT INTO subcategories (category_id, name, description, image, sort_order) VALUES (?, ?, ?, ?, ?)"
  ).bind(body.category_id, body.name, body.description || "", body.image || "", Number(body.sort_order) || 0).run();
  return json(request, env, { id: result.meta.last_row_id });
}

async function updateSubcategory(request, env, id) {
  const body = await readJson(request);
  const current = await env.DB.prepare("SELECT * FROM subcategories WHERE id = ?").bind(id).first();
  if (!current) return json(request, env, { error: "Подкатегория не найдена" }, 404);
  await env.DB.prepare("UPDATE subcategories SET category_id = ?, name = ?, description = ?, image = ?, sort_order = ? WHERE id = ?")
    .bind(body.category_id || current.category_id, body.name || current.name, body.description || "", body.image || "", Number(body.sort_order) || 0, id).run();
  return json(request, env, { ok: true });
}

async function deleteSubcategory(request, env, id) {
  await env.DB.batch([
    env.DB.prepare("UPDATE products SET subcategory_id = NULL WHERE subcategory_id = ?").bind(id),
    env.DB.prepare("DELETE FROM subcategories WHERE id = ?").bind(id),
  ]);
  return json(request, env, { ok: true });
}

async function listProducts(request, env) {
  const url = new URL(request.url);
  let sql = "SELECT * FROM products WHERE is_available = 1 AND is_draft = 0";
  const args = [];
  if (url.searchParams.get("admin") === "1") sql = "SELECT * FROM products WHERE 1 = 1";
  if (url.searchParams.get("category_id")) {
    sql += " AND category_id = ?";
    args.push(url.searchParams.get("category_id"));
  }
  if (url.searchParams.get("subcategory_id")) {
    sql += " AND subcategory_id = ?";
    args.push(url.searchParams.get("subcategory_id"));
  }
  if (url.searchParams.get("weekly") === "1") sql += " AND is_weekly_discount = 1";
  sql += " ORDER BY sort_order, id DESC";
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json(request, env, results.map(rowToProduct));
}

async function getProduct(request, env, id) {
  const product = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
  if (!product) return json(request, env, { error: "Товар не найден" }, 404);
  return json(request, env, rowToProduct(product));
}

function normalizeProduct(body) {
  return {
    category_id: body.category_id || null,
    subcategory_id: body.subcategory_id || null,
    title: String(body.title || "").trim(),
    description: body.description || "",
    price: Math.max(0, Number(body.price) || 0),
    old_price: body.old_price == null || body.old_price === "" ? null : Math.max(0, Number(body.old_price) || 0),
    image: body.image || "",
    is_weekly_discount: bool(body.is_weekly_discount),
    is_available: body.is_available === false ? 0 : 1,
    is_draft: bool(body.is_draft),
    sort_order: Number(body.sort_order) || 0,
  };
}

async function createProduct(request, env) {
  const product = normalizeProduct(await readJson(request));
  if (!product.title || !product.price) return json(request, env, { error: "Название и цена обязательны" }, 400);
  const result = await env.DB.prepare(
    `INSERT INTO products
     (category_id, subcategory_id, title, description, price, old_price, image, is_weekly_discount, is_available, is_draft, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(product.category_id, product.subcategory_id, product.title, product.description, product.price, product.old_price, product.image, product.is_weekly_discount, product.is_available, product.is_draft, product.sort_order).run();
  return json(request, env, { id: result.meta.last_row_id });
}

async function updateProduct(request, env, id) {
  const current = await env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
  if (!current) return json(request, env, { error: "Товар не найден" }, 404);
  const product = normalizeProduct(await readJson(request));
  if (!product.title || !product.price) return json(request, env, { error: "Название и цена обязательны" }, 400);
  await env.DB.prepare(
    `UPDATE products SET category_id = ?, subcategory_id = ?, title = ?, description = ?, price = ?, old_price = ?,
     image = ?, is_weekly_discount = ?, is_available = ?, is_draft = ?, sort_order = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).bind(product.category_id, product.subcategory_id, product.title, product.description, product.price, product.old_price, product.image, product.is_weekly_discount, product.is_available, product.is_draft, product.sort_order, id).run();
  return json(request, env, { ok: true });
}

async function deleteProduct(request, env, id) {
  await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  return json(request, env, { ok: true });
}

async function createOrder(request, env) {
  const body = await readJson(request);
  const {
    initData = "",
    telegram_user = {},
    customer_name,
    username = "",
    phone,
    delivery_provider,
    address,
    comment = "",
    items = [],
  } = body;
  if (env.BOT_TOKEN && initData && !(await checkWebAppInitData(initData, env.BOT_TOKEN))) {
    return json(request, env, { error: "Не удалось подтвердить Telegram Mini App" }, 403);
  }
  if (!customer_name || !phone || !["ozon", "yandex_market"].includes(delivery_provider) || !address || !items.length) {
    return json(request, env, { error: "Заполните обязательные поля заказа" }, 400);
  }
  await upsertUser(env, telegram_user, 0);
  const normalized = [];
  for (const item of items) {
    const product = await env.DB.prepare("SELECT * FROM products WHERE id = ? AND is_available = 1 AND is_draft = 0").bind(item.product_id).first();
    if (!product) return json(request, env, { error: "Один из товаров больше недоступен. Обновите корзину." }, 400);
    normalized.push({
      product_id: item.product_id,
      title: product.title,
      quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1)),
      price: Number(product.price),
    });
  }
  const total = normalized.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const inserted = await env.DB.prepare(
    `INSERT INTO orders (telegram_id, customer_name, username, phone, delivery_provider, address, comment, status, items_price, delivery_price, total_price)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, 0, ?)`
  ).bind(String(telegram_user.id || ""), customer_name, username || telegram_user.username || "", phone, delivery_provider, address, comment, total, total).run();
  const orderId = inserted.meta.last_row_id;
  await env.DB.batch(normalized.map((item) =>
    env.DB.prepare("INSERT INTO order_items (order_id, product_id, title, quantity, price) VALUES (?, ?, ?, ?, ?)")
      .bind(orderId, item.product_id, item.title, item.quantity, item.price)
  ));

  const providerLabel = delivery_provider === "ozon" ? "Озон" : "Яндекс Маркет";
  const itemLines = normalized.map((item) => `- ${item.title}: ${item.quantity} x ${item.price} ₽ = ${item.quantity * item.price} ₽`).join("\n");
  const customerTelegram = username || telegram_user.username ? `@${String(username || telegram_user.username).replace(/^@/, "")}` : String(telegram_user.id || "не указан");
  await notifyAdmin(env, `Новый заказ #${orderId}\nКлиент: ${customer_name}\nTelegram: ${customerTelegram}\nТелефон: ${phone}\nПВЗ: ${providerLabel}\nАдрес: ${address}${comment ? `\nКомментарий: ${comment}` : ""}\n\n${itemLines}\n\nТовары: ${total} ₽\nДоставка: рассчитать\nИтого: товары + доставка`);
  return json(request, env, { id: orderId, items_price: total, delivery_price: 0, total_price: total, status: "new" });
}

async function orderWithItems(env, order) {
  const { results } = await env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(order.id).all();
  return { ...order, items: results };
}

async function listOrders(request, env) {
  const { results } = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  return json(request, env, await Promise.all(results.map((order) => orderWithItems(env, order))));
}

async function getOrder(request, env, id) {
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  if (!order) return json(request, env, { error: "Заказ не найден" }, 404);
  return json(request, env, await orderWithItems(env, order));
}

async function updateOrder(request, env, id) {
  const existing = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  if (!existing) return json(request, env, { error: "Заказ не найден" }, 404);
  const body = await readJson(request);
  const status = body.status || existing.status;
  const track = body.track_number ?? existing.track_number;
  const itemsPrice = body.items_price == null ? Number(existing.items_price || existing.total_price || 0) : Math.max(0, Number(body.items_price) || 0);
  const deliveryPrice = body.delivery_price == null ? Number(existing.delivery_price || 0) : Math.max(0, Number(body.delivery_price) || 0);
  const totalPrice = itemsPrice + deliveryPrice;
  await env.DB.prepare("UPDATE orders SET status = ?, track_number = ?, items_price = ?, delivery_price = ?, total_price = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(status, track, itemsPrice, deliveryPrice, totalPrice, id).run();
  const updated = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  const calculationChanged = itemsPrice !== Number(existing.items_price || existing.total_price || 0) || deliveryPrice !== Number(existing.delivery_price || 0);
  if (STATUS_MESSAGES[status] && updated.telegram_id && (status !== existing.status || (status === "awaiting_payment" && calculationChanged))) {
    if (status === "awaiting_payment") await notifyCustomerPayment(env, updated.telegram_id, STATUS_MESSAGES[status](updated), updated.id);
    else await notifyCustomer(env, updated.telegram_id, STATUS_MESSAGES[status](updated));
  }
  return json(request, env, await orderWithItems(env, updated));
}

async function updateSettings(request, env) {
  await upsertSettings(env, await readJson(request));
  return json(request, env, await settingsObject(env));
}

async function stats(request, env) {
  const ordersToday = await env.DB.prepare("SELECT COUNT(*) c FROM orders WHERE date(created_at) = date('now')").first();
  const revenue = await env.DB.prepare("SELECT COALESCE(SUM(total_price), 0) s FROM orders WHERE status != 'cancelled'").first();
  const totalOrders = await env.DB.prepare("SELECT COUNT(*) c FROM orders").first();
  const products = await env.DB.prepare("SELECT COUNT(*) c FROM products").first();
  return json(request, env, {
    ordersToday: ordersToday.c,
    revenue: revenue.s,
    totalOrders: totalOrders.c,
    products: products.c,
  });
}

function extensionFromName(name, type) {
  const ext = String(name || "").split(".").pop()?.toLowerCase();
  if (ext && /^[a-z0-9]{1,8}$/.test(ext)) return `.${ext}`;
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  if (type === "image/svg+xml") return ".svg";
  return ".jpg";
}

async function uploadFile(request, env) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  if (!UPLOAD_TYPES.has(type)) return json(request, env, { error: "Неверная папка загрузки" }, 400);
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return json(request, env, { error: "Файл не получен" }, 400);
  if (!IMAGE_TYPES.has(file.type)) return json(request, env, { error: "Разрешены только изображения" }, 400);
  if (file.size > 8 * 1024 * 1024) return json(request, env, { error: "Файл больше 8 МБ" }, 400);
  const key = `${type}/${crypto.randomUUID()}${extensionFromName(file.name, file.type)}`;
  await env.UPLOADS.put(key, await file.arrayBuffer(), {
    metadata: { contentType: file.type || "application/octet-stream" },
  });
  return json(request, env, { url: `/uploads/${key}` });
}

async function getUpload(request, env) {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/uploads\//, ""));
  const [type] = key.split("/");
  if (!UPLOAD_TYPES.has(type) || key.includes("..") || key.startsWith("/")) return json(request, env, { error: "Not found" }, 404);
  const object = await env.UPLOADS.getWithMetadata(key, { type: "stream" });
  if (!object.value) return new Response("Not found", { status: 404, headers: corsHeaders(request, env) });
  const headers = new Headers(corsHeaders(request, env));
  headers.set("Content-Type", object.metadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.value, { headers });
}

async function exportJson(request, env) {
  const [categories, subcategories, products, orders, settings] = await Promise.all([
    env.DB.prepare("SELECT * FROM categories ORDER BY sort_order, id").all(),
    env.DB.prepare("SELECT * FROM subcategories ORDER BY sort_order, id").all(),
    env.DB.prepare("SELECT * FROM products ORDER BY sort_order, id").all(),
    env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all(),
    settingsObject(env),
  ]);
  return json(request, env, {
    manifest: { type: "f1-cloudflare-json-backup", created_at: new Date().toISOString() },
    categories: categories.results,
    subcategories: subcategories.results,
    products: products.results,
    orders: orders.results,
    settings,
  });
}

async function importJson(request, env) {
  const data = await readJson(request);
  return importData(request, env, data);
}

async function restoreJsonFromForm(request, env) {
  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return json(request, env, { error: "Файл не получен" }, 400);
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return json(request, env, { error: "Cloudflare-версия принимает JSON backup, не ZIP-файл Railway" }, 400);
  }
  return importData(request, env, data);
}

async function importData(request, env, data) {
  const imported = { categories: 0, subcategories: 0, products: 0, settings: 0 };
  if (data.settings && typeof data.settings === "object") {
    await upsertSettings(env, data.settings);
    imported.settings = Object.keys(data.settings).length;
  }
  if (Array.isArray(data.categories)) {
    for (const c of data.categories) {
      if (!c.name) continue;
      await env.DB.prepare(
        `INSERT INTO categories (id, name, description, image, sort_order)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description, image = excluded.image, sort_order = excluded.sort_order`
      ).bind(c.id || null, c.name, c.description || "", c.image || "", Number(c.sort_order) || 0).run();
      imported.categories += 1;
    }
  }
  if (Array.isArray(data.subcategories)) {
    for (const s of data.subcategories) {
      if (!s.category_id || !s.name) continue;
      await env.DB.prepare(
        `INSERT INTO subcategories (id, category_id, name, description, image, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET category_id = excluded.category_id, name = excluded.name, description = excluded.description, image = excluded.image, sort_order = excluded.sort_order`
      ).bind(s.id || null, s.category_id, s.name, s.description || "", s.image || "", Number(s.sort_order) || 0).run();
      imported.subcategories += 1;
    }
  }
  if (Array.isArray(data.products)) {
    for (const item of data.products) {
      const p = normalizeProduct(item);
      if (!p.title || !p.price) continue;
      await env.DB.prepare(
        `INSERT INTO products
         (id, category_id, subcategory_id, title, description, price, old_price, image, is_weekly_discount, is_available, is_draft, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           category_id = excluded.category_id, subcategory_id = excluded.subcategory_id, title = excluded.title,
           description = excluded.description, price = excluded.price, old_price = excluded.old_price, image = excluded.image,
           is_weekly_discount = excluded.is_weekly_discount, is_available = excluded.is_available,
           is_draft = excluded.is_draft, sort_order = excluded.sort_order, updated_at = datetime('now')`
      ).bind(item.id || null, p.category_id, p.subcategory_id, p.title, p.description, p.price, p.old_price, p.image, p.is_weekly_discount, p.is_available, p.is_draft, p.sort_order).run();
      imported.products += 1;
    }
  }
  return json(request, env, { ok: true, imported });
}

function telegramApi(env, method) {
  if (!env.BOT_TOKEN) fail("BOT_TOKEN is not configured", 500);
  return `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`;
}

async function telegramCall(env, method, body) {
  const res = await fetch(telegramApi(env, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

async function telegramMultipart(env, method, fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (value instanceof Blob) form.append(key, value, "qr-code");
    else form.append(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  const res = await fetch(telegramApi(env, method), { method: "POST", body: form });
  return res.json().catch(() => ({}));
}

async function notifyAdmin(env, text) {
  const chatId = env.ADMIN_CHAT_ID || env.ADMIN_ID;
  if (!chatId || !env.BOT_TOKEN) return;
  await telegramCall(env, "sendMessage", { chat_id: chatId, text }).catch(() => {});
}

async function notifyCustomer(env, chatId, text) {
  if (!chatId || !env.BOT_TOKEN) return;
  await telegramCall(env, "sendMessage", { chat_id: chatId, text }).catch(() => {});
}

function paymentKeyboard(settings, orderId) {
  const managerUrl = normalizeTelegramUrl(settings.manager_url || settings.manager_username);
  const paymentLink = normalizeHttpUrl(settings.payment_link);
  const keyboard = [];
  if (paymentLink) keyboard.push([{ text: "Оплатить по ссылке", url: paymentLink }]);
  if (orderId) keyboard.push([{ text: "Подтвердить оплату", callback_data: `confirm_payment:${orderId}` }]);
  keyboard.push([{ text: "Связаться с менеджером", url: managerUrl }]);
  return { inline_keyboard: keyboard };
}

async function uploadBlobByUrl(env, uploadUrl) {
  const raw = String(uploadUrl || "");
  if (!raw.startsWith("/uploads/")) return null;
  const key = raw.replace(/^\/uploads\//, "");
  const object = await env.UPLOADS.getWithMetadata(key, { type: "arrayBuffer" });
  if (!object.value) return null;
  return new Blob([object.value], { type: object.metadata?.contentType || "application/octet-stream" });
}

async function notifyCustomerPayment(env, chatId, text, orderId) {
  if (!chatId || !env.BOT_TOKEN) return;
  const settings = await settingsObject(env);
  const reply_markup = paymentKeyboard(settings, orderId);
  const qr = await uploadBlobByUrl(env, settings.qr_image);
  if (qr) {
    const photo = await telegramMultipart(env, "sendPhoto", { chat_id: chatId, photo: qr, caption: text, reply_markup }).catch(() => null);
    if (photo?.ok) return;
    const doc = await telegramMultipart(env, "sendDocument", { chat_id: chatId, document: qr, caption: text, reply_markup }).catch(() => null);
    if (doc?.ok) return;
  }
  await telegramCall(env, "sendMessage", { chat_id: chatId, text, reply_markup }).catch(() => {});
}

async function telegramWebhook(request, env) {
  const update = await readJson(request);
  if (update.message?.text?.startsWith("/start")) await handleStart(env, update.message);
  if (update.callback_query?.data?.startsWith("confirm_payment:")) await handlePaymentConfirmation(env, update.callback_query);
  return json(request, env, { ok: true });
}

async function handleStart(env, message) {
  const settings = await settingsObject(env);
  const welcomeText = settings.welcome_text || "Добро пожаловать в F1 Posters.\n\nНажмите кнопку МАГАЗИН, чтобы открыть каталог и оформить заказ.";
  const managerUrl = normalizeTelegramUrl(settings.manager_url || settings.manager_username);
  await telegramCall(env, "sendMessage", {
    chat_id: message.chat.id,
    text: welcomeText,
    reply_markup: {
      inline_keyboard: [
        [{ text: "МАГАЗИН", web_app: { url: env.WEBAPP_URL } }],
        [{ text: "Связаться с менеджером", url: managerUrl }],
      ],
    },
  });
}

async function handlePaymentConfirmation(env, query) {
  const match = String(query.data || "").match(/^confirm_payment:(\d+)$/);
  if (!match) return;
  const orderId = Number(match[1]);
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  if (!order) {
    await telegramCall(env, "answerCallbackQuery", { callback_query_id: query.id, text: "Заказ не найден", show_alert: true });
    return;
  }
  if (String(order.telegram_id || "") !== String(query.from?.id || "")) {
    await telegramCall(env, "answerCallbackQuery", { callback_query_id: query.id, text: "Эта кнопка относится к другому заказу", show_alert: true });
    return;
  }
  if (!["awaiting_confirmation", "paid", "completed"].includes(order.status)) {
    await env.DB.prepare("UPDATE orders SET status = 'awaiting_confirmation', updated_at = datetime('now') WHERE id = ?").bind(orderId).run();
    const customerTelegram = order.username ? `@${String(order.username).replace(/^@/, "")}` : String(order.telegram_id || "не указан");
    await notifyAdmin(env, `Клиент подтвердил оплату по заказу #${order.id}.\nПроверьте поступление денег на счет.\n\nКлиент: ${order.customer_name}\nTelegram: ${customerTelegram}\nТелефон: ${order.phone}\nТовары: ${order.items_price} ₽\nДоставка: ${order.delivery_price} ₽\nИтого: ${order.total_price} ₽`);
  }
  await telegramCall(env, "answerCallbackQuery", { callback_query_id: query.id, text: "Спасибо. Администратор проверит оплату." });
}

async function setupBot(request, env) {
  const origin = new URL(request.url).origin;
  const webhookUrl = `${origin}/telegram/webhook`;
  const [webhook, commands, menu, shortDescription, description] = await Promise.all([
    telegramCall(env, "setWebhook", { url: webhookUrl }),
    telegramCall(env, "setMyCommands", { commands: [{ command: "start", description: "Открыть магазин" }] }),
    telegramCall(env, "setChatMenuButton", { menu_button: { type: "web_app", text: "МАГАЗИН", web_app: { url: env.WEBAPP_URL } } }),
    telegramCall(env, "setMyShortDescription", { short_description: "Магазин товаров Formula 1: постеры, LEGO, одежда и кастомные иллюстрации." }),
    telegramCall(env, "setMyDescription", { description: "Откройте магазин, выберите товары Formula 1 и оформите заказ. Администратор рассчитает доставку и отправит QR-код или ссылку для оплаты." }),
  ]);
  return json(request, env, { ok: Boolean(webhook.ok), webhookUrl, results: { webhook, commands, menu, shortDescription, description } });
}
