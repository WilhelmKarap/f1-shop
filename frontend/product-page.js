const API = window.F1_CONFIG.API_URL;
const id = Number(new URLSearchParams(location.search).get("id"));
let product = null;
let settings = {};
let categories = [];
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const asset = (url) => url ? (/^(https?:|data:)/.test(url) ? url : `${API}${url}`) : "";
const money = (value) => `${new Intl.NumberFormat("ru-RU").format(Number(value) || 0)} ₽`;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanCopy(value = "") {
  return String(value)
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\u200d\ufe0f]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function getJson(path) {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Не удалось загрузить товар");
  return response.json();
}

function managerUrl() {
  const raw = settings.manager_url || settings.manager_username || "F1posters_mng";
  return /^https?:\/\//.test(raw) ? raw : `https://t.me/${String(raw).replace(/^@/, "")}`;
}

function getCart() {
  try { return JSON.parse(localStorage.getItem("f1-posters-cart") || "[]"); } catch { return []; }
}

function updateCartCount() {
  $("#cartCount").textContent = getCart().reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

function showToast(message) {
  clearTimeout(toastTimer); $("#toast").textContent = message; $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 2400);
}

function addToCart() {
  if (product.is_custom) {
    $("#productPrice").classList.remove("hidden");
    $("#managerLink").classList.remove("hidden");
    $("#productAction").classList.add("hidden");
    return;
  }
  const cart = getCart();
  const item = cart.find((entry) => String(entry.product_id) === String(product.id));
  if (item) item.quantity = Math.min(99, (Number(item.quantity) || 0) + 1);
  else cart.push({ product_id: product.id, title: product.title, price: product.price, quantity: 1, image: product.cover_image || product.image, category_id: product.category_id });
  localStorage.setItem("f1-posters-cart", JSON.stringify(cart)); updateCartCount(); showToast("Товар добавлен в корзину");
}

function spec(label, value) { return value ? `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>` : ""; }

function render() {
  const team = window.F1_TEAM_BY_SLUG?.[product.team];
  const category = categories.find((item) => String(item.id) === String(product.category_id));
  const title = cleanCopy(product.title);
  $("#productImage").src = asset(product.main_image || product.cover_image || product.image) || "assets/fallback-poster.webp";
  $("#productImage").alt = title;
  $("#productImage").onerror = () => { $("#productImage").src = "assets/fallback-poster.webp"; };
  $("#productTitle").textContent = title;
  $("#productDescription").textContent = cleanCopy(product.description) || "Подробности по этой работе можно уточнить у менеджера.";
  $("#productKicker").textContent = team?.name || category?.name || settings.site_product_kicker || "Коллекция F1 Posters";
  $("#productPrice").textContent = product.is_custom ? (product.custom_price ? `От ${money(product.custom_price)}` : settings.site_price_on_request || "Цена по запросу") : money(product.price);
  $("#productPrice").classList.toggle("hidden", Boolean(product.is_custom));
  $("#productOldPrice").textContent = !product.is_custom && product.old_price ? money(product.old_price) : "";
  $("#productAction").textContent = product.is_custom ? settings.site_custom_product_button || "Узнать цену" : settings.site_add_to_cart || "Добавить в корзину";
  $("#productSpecs").innerHTML = [spec("Команда", team?.name), spec("Категория", category?.name), spec("Размер", product.product_size), spec("Набор LEGO", product.lego_set), spec("Проект", product.project_name), spec("Тип", product.custom_type), spec("Рамка", product.includes_frame ? "В комплекте" : ""), spec("Крепление", product.includes_mount ? "В комплекте" : "")].join("");
  if (team) $("#productBack").href = `team.html?team=${encodeURIComponent(team.slug)}`;
  $("#managerLink").href = managerUrl();
  $("#managerLink").classList.toggle("hidden", Boolean(product.is_custom));
  document.title = `${title} — F1 Posters`;
  document.querySelector('meta[name="description"]').content = cleanCopy(product.description || title).slice(0, 155);
}

$("#productAction").addEventListener("click", addToCart);
updateCartCount();
if (!id) { $("#productTitle").textContent = "Товар не найден"; }
else Promise.all([getJson(`/api/products/${id}`), getJson("/api/settings"), getJson("/api/categories")])
  .then(([loadedProduct, loadedSettings, loadedCategories]) => { product = loadedProduct; settings = loadedSettings; categories = loadedCategories; render(); })
  .catch((error) => { $("#productTitle").textContent = error.message; $("#productAction").disabled = true; });
