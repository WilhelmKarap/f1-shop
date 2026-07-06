const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

if (!botToken) {
  console.error("BOT_TOKEN is required");
  process.exit(1);
}

if (!webAppUrl || !webAppUrl.startsWith("https://")) {
  console.error("WEBAPP_URL must be a public HTTPS URL");
  process.exit(1);
}

async function api(method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`${method}: ${data.description || "Telegram API error"}`);
  }
  return data.result;
}

async function main() {
  await api("setMyName", { name: "F1 Constructor Shop" });
  await api("setMyShortDescription", {
    short_description: "Магазин постеров, одежды, конструкторов и кастомных иллюстраций по Формуле 1.",
  });
  await api("setMyDescription", {
    description: "С помощью бота вы можете открыть онлайн-магазин F1 Constructor Shop, выбрать товары, оплатить заказ по QR-коду и дождаться подтверждения модератора.",
  });
  await api("setMyCommands", {
    commands: [{ command: "start", description: "Открыть магазин" }],
  });
  await api("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "МАГАЗИН",
      web_app: { url: webAppUrl },
    },
  });
  console.log("Bot profile, commands and menu button were configured.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
