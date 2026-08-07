# F1 Constructor Shop

Telegram Mini App shop with a standalone web admin panel.

## Production

- Frontend: `https://shop-web-rose.vercel.app`
- Backend: `https://f1-constructor-shop.f1-constructor-shop-cloudflare.workers.dev`
- Telegram bot: `@F1posters_bot`

The frontend is hosted on Vercel. The API and Telegram webhook run on Cloudflare Workers. Products, categories, settings and orders are stored in Cloudflare D1. Uploaded images are stored in Workers KV.

## Structure

- `frontend/` - Telegram Mini App storefront and standalone admin panel.
- `cloudflare-worker/` - current production backend, D1 migrations and import tools.
- `backend/` - legacy Railway/Express backend kept only for reference and old backup compatibility.

The admin panel is opened separately at `https://shop-web-rose.vercel.app/admin.html` and is not linked from the public storefront.

## Cloudflare Deploy

```powershell
cd cloudflare-worker
npm install
npx wrangler login
npm run db:migrate
npm run deploy
```

Required Cloudflare secrets:

- `BOT_TOKEN`
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `ADMIN_CHAT_ID`

Do not place secrets in frontend files or commit them to GitHub.

## Assortment Import

The idempotent JSON importer accepts `categories.json`, `products.json` and `settings.json` from the old Railway shop:

```powershell
$env:CF_API_URL="https://f1-constructor-shop.f1-constructor-shop-cloudflare.workers.dev"
$env:ADMIN_LOGIN="admin"
$env:ADMIN_PASSWORD="your-password"
node tools/import-assortment.mjs
```

JSON backups contain database records and image paths. Image binaries must be uploaded separately through the admin panel or migrated from the old `uploads/` directory.

## Backups

The Cloudflare admin panel downloads and restores JSON backups. The import uses source IDs and upserts records, so restoring the same backup does not create duplicate products or categories.
