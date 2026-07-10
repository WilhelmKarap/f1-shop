const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("./database");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

function checkTelegramLogin(data, botToken) {
  if (!botToken || !data?.hash) return false;
  const { hash, ...fields } = data;
  const checkString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const digest = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");
  const authDate = Number(fields.auth_date || 0);
  return digest === hash && Math.floor(Date.now() / 1000) - authDate < 86400;
}

function checkWebAppInitData(initData, botToken) {
  if (!botToken || !initData) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");
  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const digest = crypto.createHmac("sha256", secret).update(checkString).digest("hex");
  return Boolean(hash && digest === hash);
}

function upsertUser(user, isAdmin = 0) {
  db.prepare(
    `INSERT INTO users (telegram_id, username, first_name, last_name, is_admin)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET
       username = excluded.username,
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       is_admin = max(users.is_admin, excluded.is_admin)`
  ).run(String(user.id), user.username || "", user.first_name || "", user.last_name || "", isAdmin ? 1 : 0);
}

function createSessionToken(user) {
  return jwt.sign(
    { id: String(user.id), username: user.username || "", first_name: user.first_name || "" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (String(payload.id) !== String(process.env.ADMIN_ID)) {
      return res.status(403).json({ error: "Доступ запрещен" });
    }
    req.admin = payload;
    next();
  } catch {
    res.status(403).json({ error: "Доступ запрещен" });
  }
}

module.exports = { checkTelegramLogin, checkWebAppInitData, createSessionToken, requireAdmin, upsertUser };
