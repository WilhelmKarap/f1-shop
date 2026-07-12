const Database = require("better-sqlite3");
const { databasePath, ensureStorage } = require("./storage");

let db;

function openDatabase() {
  ensureStorage();
  db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  seedIfEmpty(db);
  return db;
}

function migrate(instance) {
  instance.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT UNIQUE NOT NULL,
  username TEXT DEFAULT '',
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL,
  old_price REAL,
  image TEXT DEFAULT '',
  is_weekly_discount INTEGER DEFAULT 0,
  is_available INTEGER DEFAULT 1,
  is_draft INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT,
  customer_name TEXT NOT NULL,
  username TEXT DEFAULT '',
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  comment TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  total_price REAL NOT NULL DEFAULT 0,
  track_number TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

  ensureColumn(instance, "products", "is_draft", "is_draft INTEGER DEFAULT 0");
  ensureColumn(instance, "products", "updated_at", "updated_at TEXT DEFAULT (datetime('now'))");
  ensureColumn(instance, "orders", "total_price", "total_price REAL NOT NULL DEFAULT 0");
  ensureColumn(instance, "orders", "track_number", "track_number TEXT DEFAULT ''");
  ensureColumn(instance, "orders", "updated_at", "updated_at TEXT DEFAULT (datetime('now'))");
}

function ensureColumn(instance, table, column, ddl) {
  const exists = instance.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
  if (!exists) instance.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

function seedIfEmpty(instance) {
  const tables = ["categories", "products", "orders", "settings"];
  const isEmpty = tables.every((table) => instance.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count === 0);
  if (!isEmpty) return;

  const defaultSettings = {
    shop_name: "F1 Constructor Shop",
    manager_username: "F1posters_bot",
    manager_url: "https://t.me/F1posters_bot",
    banner_text: "Posters, LEGO Formula 1, clothes and custom illustrations",
    banner_image: "",
    logo_image: "",
    qr_image: "",
    delivery_text: "Delivery across Russia.",
    payment_text: "Payment by QR transfer. The moderator confirms the order after payment.",
    welcome_text: [
      "Добро пожаловать в F1 Constructor Shop.",
      "",
      "Нажмите кнопку МАГАЗИН, чтобы открыть каталог и оформить заказ.",
      "",
      "Оплата переводом. Доставка СДЭК.",
    ].join("\n"),
  };
  const insertSetting = instance.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(defaultSettings)) insertSetting.run(key, value);

  const insertCategory = instance.prepare(
    "INSERT INTO categories (name, description, sort_order) VALUES (?, ?, ?)"
  );
  [
    ["Постеры Formula 1", "Команды, пилоты и болиды", 10],
    ["Постеры LEGO Formula 1", "Постеры для конструкторов", 20],
    ["Тематическая одежда", "Футболки и дропы", 30],
    ["Готовые иллюстрации", "Арт с конструкторами", 40],
    ["Кастомные постеры", "Индивидуальные макеты", 50],
    ["Другое", "Конструкторы и наклейки", 60],
  ].forEach((row) => insertCategory.run(...row));
}

function reconnect() {
  if (db?.open) db.close();
  return openDatabase();
}

function getDb() {
  if (!db?.open) openDatabase();
  return db;
}

openDatabase();

const proxy = new Proxy({}, {
  get(target, prop) {
    if (prop === "reconnect") return reconnect;
    if (prop === "getDb") return getDb;
    if (prop === "path") return databasePath;
    const value = getDb()[prop];
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});

module.exports = proxy;
