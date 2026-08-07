import fs from "node:fs/promises";
import path from "node:path";

const apiUrl = process.env.CF_API_URL;
const login = process.env.ADMIN_LOGIN || "admin";
const password = process.env.ADMIN_PASSWORD;
const sourceDir = process.env.ASSORTMENT_DIR || path.resolve(process.cwd(), "..", "..", "assortment");

if (!apiUrl || !password) {
  console.error("Set CF_API_URL and ADMIN_PASSWORD before running this script.");
  process.exit(1);
}

async function readJson(name) {
  return JSON.parse(await fs.readFile(path.join(sourceDir, name), "utf8"));
}

const loginRes = await fetch(`${apiUrl}/api/admin/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ login, password }),
});

if (!loginRes.ok) {
  console.error(await loginRes.text());
  process.exit(1);
}

const { token } = await loginRes.json();
const payload = {
  categories: await readJson("categories.json"),
  products: await readJson("products.json"),
  settings: await readJson("settings.json"),
};

const importRes = await fetch(`${apiUrl}/api/admin/import-json`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify(payload),
});

console.log(await importRes.text());
if (!importRes.ok) process.exit(1);
