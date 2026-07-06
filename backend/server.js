const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const botToken = process.env.BOT_TOKEN || "";
const moderatorChatId = process.env.MODERATOR_CHAT_ID || "";
const ordersCsv = path.join(root, "orders.csv");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Access-Control-Allow-Origin": "*" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) req.destroy();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function verifyTelegramInitData(initData) {
  if (!botToken || !initData) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return hash && crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hash));
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function appendOrder(order) {
  const exists = fs.existsSync(ordersCsv);
  const header = ["id", "createdAt", "status", "name", "phone", "email", "telegram", "address", "items", "total"];
  const items = (order.items || []).map((item) => `${item.title} / ${item.option} / ${item.qty} шт.`).join("; ");
  const row = [
    order.id,
    order.createdAt,
    order.status,
    order.customer?.name,
    order.customer?.phone,
    order.customer?.email,
    order.customer?.telegram,
    order.customer?.address,
    items,
    order.total,
  ].map(csvCell).join(";");
  if (!exists) fs.writeFileSync(ordersCsv, `\ufeff${header.join(";")}\n`, "utf8");
  fs.appendFileSync(ordersCsv, `${row}\n`, "utf8");
}

async function notifyModerator(order) {
  if (!botToken || !moderatorChatId) return;
  const text = [
    `Новый заказ ${order.id}`,
    `Статус: ${order.status}`,
    `Сумма: ${order.total} ₽`,
    `Покупатель: ${order.customer?.name || ""}`,
    `Телефон: ${order.customer?.phone || ""}`,
    `Telegram: ${order.customer?.telegram || ""}`,
  ].join("\n");
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: moderatorChatId, text }),
  }).catch(() => {});
}

async function handleOrder(req, res) {
  const payload = JSON.parse(await readBody(req));
  if (botToken && !verifyTelegramInitData(payload.initData)) {
    send(res, 401, JSON.stringify({ ok: false, error: "telegram_auth_failed" }));
    return;
  }
  appendOrder(payload.order);
  await notifyModerator(payload.order);
  send(res, 200, JSON.stringify({ ok: true, orderId: payload.order.id }));
}

function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requested));
  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    send(res, 200, data, mime[path.extname(filePath)] || "application/octet-stream");
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, "");
    return;
  }
  if (req.method === "POST" && req.url === "/api/orders") {
    try {
      await handleOrder(req, res);
    } catch {
      send(res, 400, JSON.stringify({ ok: false, error: "bad_request" }));
    }
    return;
  }
  serveFile(req, res);
});

server.listen(port, () => {
  console.log(`F1 Constructor Shop is running on http://localhost:${port}`);
});
