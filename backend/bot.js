require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const managerUrl = process.env.MANAGER_URL || "https://t.me/F1posters_bot";
const adminChatId = process.env.ADMIN_CHAT_ID || process.env.ADMIN_ID;

let bot = null;

function getBot() {
  if (!token) return null;
  if (!bot) bot = new TelegramBot(token, { polling: false });
  return bot;
}

function startPolling() {
  if (!token || !webAppUrl) {
    console.log("Telegram bot is disabled: BOT_TOKEN or WEBAPP_URL is missing.");
    return;
  }
  bot = new TelegramBot(token, { polling: true });
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, process.env.WELCOME_TEXT || defaultWelcome(), {
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
    "Оплата переводом.",
    "Доставка СДЭК.",
    "После оплаты модератор подтвердит заказ.",
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

module.exports = { startPolling, notifyAdmin, notifyCustomer };
