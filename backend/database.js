const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "database.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
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

function ensureColumn(table, column, ddl) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

ensureColumn("products", "is_draft", "is_draft INTEGER DEFAULT 0");
ensureColumn("products", "updated_at", "updated_at TEXT DEFAULT (datetime('now'))");
ensureColumn("orders", "total_price", "total_price REAL NOT NULL DEFAULT 0");
ensureColumn("orders", "track_number", "track_number TEXT DEFAULT ''");
ensureColumn("orders", "updated_at", "updated_at TEXT DEFAULT (datetime('now'))");

const defaultSettings = {
  shop_name: "F1 Constructor Shop",
  manager_username: "F1posters_bot",
  manager_url: "https://t.me/F1posters_bot",
  banner_text: "Постеры, LEGO Formula 1, одежда и кастомные иллюстрации",
  banner_image: "",
  logo_image: "",
  qr_image: "",
  delivery_text: "Доставка СДЭК по России.",
  payment_text: "Оплата переводом по QR-коду. После оплаты модератор подтверждает заказ.",
  welcome_text: "Добро пожаловать в F1 Constructor Shop.\n\nНажмите кнопку МАГАЗИН, чтобы открыть каталог и оформить заказ.\n\nОплата переводом. Доставка СДЭК.",
};

const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
for (const [key, value] of Object.entries(defaultSettings)) insertSetting.run(key, value);

const categoryCount = db.prepare("SELECT COUNT(*) AS count FROM categories").get().count;
if (!categoryCount) {
  const insertCategory = db.prepare(
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

module.exports = db;
