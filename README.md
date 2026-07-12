# F1 Constructor Shop

Telegram Mini App shop with a standalone web CMS.

## Structure

- `frontend/` - public Telegram Mini App storefront and standalone admin panel.
- `backend/` - Express REST API, SQLite database, Telegram bot, uploads.

The public storefront does not contain links to the admin panel. The admin panel is opened separately at `admin.html`.

## Current Deploy URLs

- Frontend: `https://shop-web-rose.vercel.app`
- Backend: `https://shop-web-production-9d66.up.railway.app`

`frontend/config.js` points to the Railway backend.

## Backend Variables

Set these in Railway Variables:

- `BOT_TOKEN` - Telegram bot token.
- `ADMIN_LOGIN` - admin panel login.
- `ADMIN_PASSWORD` - admin panel password.
- `ADMIN_SECRET` - optional password-only secret fallback.
- `JWT_SECRET` - long random string for admin sessions.
- `ADMIN_CHAT_ID` - chat id for new-order notifications.
- `WEBAPP_URL` - public HTTPS URL of `frontend/index.html`.
- `MANAGER_URL` - Telegram manager link.
- `FRONTEND_ORIGIN` - Vercel frontend origin or `*`.

Telegram Login Widget is not used for admin access anymore.

## Admin Auth

Admin login flow:

1. `frontend/admin.html` shows login/password form.
2. `frontend/admin.js` sends credentials to `POST /api/admin/login`.
3. Backend checks `ADMIN_LOGIN` and `ADMIN_PASSWORD` on the server.
4. Backend returns a temporary JWT.
5. Admin requests use `Authorization: Bearer <token>`.

Do not put admin login, password, bot token, or JWT secret into frontend files or GitHub.

## Backend

```bash
cd backend
npm install
npm start
```

Railway installs dependencies from `backend/package.json` automatically.

## Data

Products, categories, orders, order items, users, and settings are stored in SQLite.
Images are uploaded into:

- `backend/uploads/products`
- `backend/uploads/categories`
- `backend/uploads/banners`
- `backend/uploads/logo`
- `backend/uploads/qr`

SQLite stores only image paths, not image binary data.
