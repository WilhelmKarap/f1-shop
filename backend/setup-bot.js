require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

if (!token || !webAppUrl) {
  console.error("BOT_TOKEN and WEBAPP_URL are required.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: false });

(async () => {
  await bot.setMyCommands([{ command: "start", description: "Открыть магазин" }]);
  await bot.setChatMenuButton({
    menu_button: { type: "web_app", text: "МАГАЗИН", web_app: { url: webAppUrl } },
  });
  await bot.setMyShortDescription("Магазин товаров Formula 1: постеры, LEGO, одежда и кастомные иллюстрации.");
  await bot.setMyDescription("Откройте магазин, выберите товары Formula 1 и оформите заказ. Администратор рассчитает доставку и отправит QR-код или ссылку для оплаты.");
  console.log("Bot commands, menu button and descriptions were configured.");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
