require("dotenv").config();
const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
const db = require("./database");
const { uploadsDir } = require("./storage");

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const adminChatId = process.env.ADMIN_CHAT_ID || process.env.ADMIN_ID;

let bot = null;

function getBot() {
  if (!token) return null;
  if (!bot) bot = new TelegramBot(token, { polling: false });
  return bot;
}

function getSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
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
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return "";
}

function qrImagePath(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/uploads/qr/")) return "";
  const filename = path.basename(raw);
  const filePath = path.join(uploadsDir, "qr", filename);
  return fs.existsSync(filePath) ? filePath : "";
}

function paymentKeyboard(settings) {
  const managerUrl = normalizeTelegramUrl(settings.manager_url || settings.manager_username || process.env.MANAGER_URL);
  const paymentLink = normalizeHttpUrl(settings.payment_link);
  const keyboard = [];
  if (paymentLink) keyboard.push([{ text: "Оплатить по ссылке", url: paymentLink }]);
  keyboard.push([{ text: "Связаться с менеджером", url: managerUrl }]);
  return { inline_keyboard: keyboard };
}

function startPolling() {
  if (!token || !webAppUrl) {
    console.log("Telegram bot is disabled: BOT_TOKEN or WEBAPP_URL is missing.");
    return;
  }
  bot = new TelegramBot(token, { polling: true });
  bot.onText(/\/start/, async (msg) => {
    const settings = getSettings();
    const welcomeText = settings.welcome_text || process.env.WELCOME_TEXT || defaultWelcome();
    const managerUrl = normalizeTelegramUrl(settings.manager_url || settings.manager_username || process.env.MANAGER_URL);
    await bot.sendMessage(msg.chat.id, welcomeText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "МАГАЗИН", web_app: { url: webAppUrl } }],
          [{ text: "Связаться с менеджером", url: managerUrl }],
        ],
      },
    });
  });
  console.log("Telegram bot polling started.");
}

function defaultWelcome() {
  return [
    "Добро пожаловать в F1 Constructor Shop.",
    "",
    "Нажмите кнопку МАГАЗИН, чтобы посмотреть каталог и оформить заказ.",
    "",
    "Соберите корзину и оформите заказ.",
    "Доставка в ПВЗ Озон или Яндекс Маркет.",
    "Администратор рассчитает доставку и отправит реквизиты для оплаты.",
  ].join("\n");
}

async function notifyAdmin(text) {
  const instance = getBot();
  if (instance && adminChatId) await instance.sendMessage(adminChatId, text).catch(() => {});
}

async function notifyCustomer(chatId, text) {
  const instance = getBot();
  if (instance && chatId) await instance.sendMessage(chatId, text).catch(() => {});
}

async function notifyCustomerPayment(chatId, text) {
  const instance = getBot();
  if (!instance || !chatId) return;
  const settings = getSettings();
  const reply_markup = paymentKeyboard(settings);
  const photo = qrImagePath(settings.qr_image);
  if (photo) {
    await instance.sendPhoto(chatId, photo, { caption: text, reply_markup }).catch(async () => {
      await instance.sendDocument(chatId, photo, { caption: text, reply_markup }).catch(async () => {
        await instance.sendMessage(chatId, text, { reply_markup }).catch(() => {});
      });
    });
    return;
  }
  await instance.sendMessage(chatId, text, { reply_markup }).catch(() => {});
}

module.exports = { startPolling, notifyAdmin, notifyCustomer, notifyCustomerPayment };
