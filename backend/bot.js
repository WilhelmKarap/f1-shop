const botToken = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
const managerUrl = process.env.MANAGER_URL || "https://t.me/F1posters_bot";
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 1200);

if (!botToken) {
  console.error("BOT_TOKEN is required");
  process.exit(1);
}

if (!webAppUrl || !webAppUrl.startsWith("https://")) {
  console.error("WEBAPP_URL must be a public HTTPS URL, for example https://your-domain.com/index.html");
  process.exit(1);
}

let offset = 0;

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

function startText(firstName) {
  const name = firstName ? `, ${firstName}` : "";
  return [
    `Добро пожаловать в F1 Constructor Shop${name}.`,
    "",
    "Нажмите кнопку “МАГАЗИН”, чтобы открыть каталог и оформить заказ.",
    "",
    "Оплата переводом.",
    "Доставка СДЭК.",
    "После оплаты модератор подтвердит заказ.",
  ].join("\n");
}

async function sendStart(chatId, user) {
  await api("sendMessage", {
    chat_id: chatId,
    text: startText(user?.first_name),
    reply_markup: {
      inline_keyboard: [
        [{ text: "МАГАЗИН", web_app: { url: webAppUrl } }],
        [{ text: "Связаться с менеджером", url: managerUrl }],
      ],
    },
  });
}

async function handleUpdate(update) {
  const message = update.message;
  if (!message?.chat?.id) return;

  const text = String(message.text || "").trim();
  if (text === "/start" || text.startsWith("/start ")) {
    await sendStart(message.chat.id, message.from);
    return;
  }

  await api("sendMessage", {
    chat_id: message.chat.id,
    text: "Откройте магазин через кнопку ниже.",
    reply_markup: {
      inline_keyboard: [[{ text: "МАГАЗИН", web_app: { url: webAppUrl } }]],
    },
  });
}

async function poll() {
  while (true) {
    try {
      const updates = await api("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message"],
      });
      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (error) {
      console.error(error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

api("deleteWebhook", { drop_pending_updates: false })
  .then(() => poll())
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
