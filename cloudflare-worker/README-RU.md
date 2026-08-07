# Cloudflare Workers backend для F1 Posters

Этот backend заменяет Railway без привязки карты:

- Cloudflare Worker вместо Node/Express сервера.
- Cloudflare D1 вместо `database.db`.
- Cloudflare KV вместо папки `uploads`.
- Telegram bot работает через webhook, а не через polling.
- Frontend на Vercel можно оставить как есть, поменяется только `API_URL`.

Старый `backend/` не удален. Он остается запасным вариантом.

## 1. Подготовить Cloudflare

1. Зарегистрируйтесь на Cloudflare.
2. Установите Node.js 20+.
3. В папке `cloudflare-worker` выполните:

```bash
npm install
npx wrangler login
```

## 2. Создать D1 базу

```bash
npx wrangler d1 create f1_constructor_shop
```

Cloudflare покажет `database_id`. Вставьте его в `wrangler.jsonc` вместо:

```text
REPLACE_WITH_D1_DATABASE_ID
```

## 3. Создать KV для картинок

```bash
npx wrangler kv namespace create UPLOADS
```

Cloudflare покажет `id`. Вставьте его в `wrangler.jsonc` вместо:

```text
REPLACE_WITH_KV_NAMESPACE_ID
```

## 4. Задать секреты

Выполните команды из папки `cloudflare-worker`:

```bash
npx wrangler secret put BOT_TOKEN
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_CHAT_ID
```

Также можно задать:

```bash
npx wrangler secret put ADMIN_LOGIN
```

Если не задавать `ADMIN_LOGIN`, в `wrangler.jsonc` уже стоит `admin`.

## 5. Применить таблицы

```bash
npm run db:migrate
npm run db:seed
```

## 6. Задеплоить backend

```bash
npm run deploy
```

После деплоя Cloudflare даст адрес вида:

```text
https://f1-constructor-shop.<account>.workers.dev
```

Проверьте:

```text
https://f1-constructor-shop.<account>.workers.dev/api/health
```

Должна быть версия:

```json
{"ok":true,"version":"cloudflare-2026-08-07.1"}
```

## 7. Настроить Telegram bot webhook

Откройте админку уже с новым backend URL или временно вызовите endpoint через любой REST-клиент:

```text
POST /api/admin/setup-bot
Authorization: Bearer <admin token>
```

Проще через браузерную админку:

1. Сначала поменяйте `frontend/config.js` на новый Cloudflare API URL.
2. Задеплойте Vercel.
3. Войдите в админку.
4. Откройте настройки и сохраните их.

Если нужно, я отдельно добавлю кнопку `Настроить Telegram webhook` в админ-панель.

## 8. Импортировать ассортимент

Из папки `cloudflare-worker`:

```bash
$env:CF_API_URL="https://f1-constructor-shop.<account>.workers.dev"
$env:ADMIN_PASSWORD="ваш_пароль_админа"
node tools/import-assortment.mjs
```

Скрипт берет данные из:

```text
C:\Users\Wilhelm\Desktop\F1\assortment
```

Будут импортированы:

- `categories.json`
- `products.json`
- `settings.json`

Важно: старые JSON-файлы содержат ссылки на картинки, но не сами изображения. После перехода на KV картинки нужно будет загрузить заново через админку, если они не доступны по текущему backend.

## 9. Поменять Vercel frontend

В файле:

```text
frontend/config.js
```

замените:

```js
API_URL: "https://shop-web-production-9d66.up.railway.app"
```

на:

```js
API_URL: "https://f1-constructor-shop.<account>.workers.dev"
```

После этого redeploy на Vercel.

## Что работает в Cloudflare-версии

- Категории.
- Подкатегории.
- Товары.
- Загрузка изображений.
- Настройки.
- Оформление заказа.
- Уведомление админу.
- Расчет товаров + доставки.
- Отправка QR-кода клиенту.
- Кнопка оплаты по ссылке.
- Кнопка подтверждения оплаты.
- Связь с менеджером.
- Telegram `/start` и кнопка магазина.

## Главное отличие от Railway

На Railway был физический файл:

```text
database.db
uploads/
```

В Cloudflare этого нет:

```text
D1 = база
KV = картинки
Worker = API и Telegram webhook
```

Поэтому старые ZIP backup от Railway не восстанавливаются напрямую в Cloudflare. Для Cloudflare используется JSON импорт/экспорт.
