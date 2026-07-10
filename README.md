# F1 Constructor Shop

Production-ready skeleton for a Telegram Mini App shop.

## Structure

- `frontend/` - Telegram Mini App storefront and standalone admin panel.
- `backend/` - Express REST API, SQLite database, Telegram bot, uploads.

## Backend

```bash
cd backend
npm install
copy .env.example .env
npm start
```

Required environment variables:

- `BOT_TOKEN` - Telegram bot token.
- `ADMIN_ID` - Telegram id allowed to open admin panel.
- `JWT_SECRET` - long random string.
- `WEBAPP_URL` - public HTTPS URL of `frontend/index.html`.
- `ADMIN_CHAT_ID` - where new-order notifications are sent.

## Deploy

- Frontend: Vercel.
- Backend: Railway.
- Set `API_BASE_URL` in frontend hosting if backend is on another domain, or edit `frontend/config.js`.

No products or categories are hardcoded in frontend JavaScript. Catalog data is loaded from the backend API and stored in SQLite.
