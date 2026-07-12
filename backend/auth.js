const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("./database");

const JWT_SECRET = process.env.JWT_SECRET || "change-me";

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function checkAdminPassword(login, password) {
  const expectedLogin = process.env.ADMIN_LOGIN || "";
  const expectedPassword = process.env.ADMIN_PASSWORD || "";
  const expectedSecret = process.env.ADMIN_SECRET || "";

  if (expectedSecret && safeEqual(password, expectedSecret)) return true;
  if (!expectedLogin || !expectedPassword) return false;
  return safeEqual(login, expectedLogin) && safeEqual(password, expectedPassword);
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

function createAdminSession(login) {
  return jwt.sign(
    { role: "admin", login: String(login || "admin") },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

module.exports = { checkAdminPassword, checkWebAppInitData, createAdminSession, requireAdmin, upsertUser };
