const API = window.F1_CONFIG.API_URL;
const FALLBACK = "assets/fallback-poster.webp";
const slug = new URLSearchParams(location.search).get("team") || "other";
const team = window.F1_TEAM_BY_SLUG?.[slug] || window.F1_TEAM_BY_SLUG?.other;
let products = [];
let settings = {};
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const asset = (url) => url ? (/^(https?:|data:)/.test(url) ? url : `${API}${url}`) : "";
const money = (value) => `${new Intl.NumberFormat("ru-RU").format(Number(value) || 0)} ₽`;
const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const cleanCopy = (value = "") => String(value).replace(/\p{Extended_Pictographic}/gu, "").replace(/[\u200d\ufe0f]/g, "").replace(/[ \t]{2,}/g, " ").trim();

async function getJson(path) {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Не удалось загрузить коллекцию");
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

function addToCart(product) {
  if (product.is_custom) { window.open(managerUrl(), "_blank", "noopener"); return; }
  const cart = getCart();
  const item = cart.find((entry) => String(entry.product_id) === String(product.id));
  if (item) item.quantity = Math.min(99, (Number(item.quantity) || 0) + 1);
  else cart.push({ product_id: product.id, title: product.title, price: product.price, quantity: 1, image: product.cover_image || product.image, category_id: product.category_id });
  localStorage.setItem("f1-posters-cart", JSON.stringify(cart));
  updateCartCount();
  showToast(`${cleanCopy(product.title)} добавлен в корзину`);
}

function showToast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 2400);
}

function setImage(id, url, alt = "") {
  const image = $(`#${id}`);
  if (!url) return;
  image.src = asset(url);
  image.alt = alt;
  image.classList.remove("hidden");
}

function renderTeam() {
  const colors = team.colors;
  document.documentElement.style.setProperty("--primary", colors.primary);
  document.documentElement.style.setProperty("--secondary", colors.secondary);
  document.documentElement.style.setProperty("--accent", colors.accent);
  document.documentElement.style.setProperty("--dark", colors.dark);
  document.documentElement.style.setProperty("--light", colors.light);
  $("#teamName").textContent = team.name;
  $("#teamDrivers").innerHTML = team.drivers.map((driver) => `<span>${escapeHtml(driver)}</span>`).join("");
  setImage("teamLogo", settings[`team_${slug}_logo`], team.name);
  setImage("teamBackground", settings[`team_${slug}_background`]);
  setImage("teamForeground", settings[`team_${slug}_foreground`]);
  $("#managerLink").href = managerUrl();
  document.title = `${team.name} — F1 Posters`;
}

function renderProducts() {
  $("#teamProductCount").textContent = `${products.length} товаров`;
  $("#teamProducts").innerHTML = products.map((product) => {
    const image = asset(product.cover_image || product.image) || FALLBACK;
    const title = cleanCopy(product.title);
    const custom = Boolean(product.is_custom);
    const price = custom ? (product.custom_price ? `От ${money(product.custom_price)}` : "Цена по запросу") : money(product.price);
    return `<article class="page-product-card">
      <a class="page-product-card__media" href="product.html?id=${product.id}"><img src="${escapeHtml(image)}" onerror="this.src='${FALLBACK}'" alt="${escapeHtml(title)}" loading="lazy" /></a>
      <div class="page-product-card__body"><small>${escapeHtml(team.name)}</small><h3>${escapeHtml(title)}</h3><strong>${escapeHtml(price)}</strong>
      <button type="button" data-add="${product.id}" aria-label="${custom ? "Узнать стоимость" : "Добавить в корзину"}">${custom ? "?" : "+"}</button></div>
    </article>`;
  }).join("") || `<p class="page-message">Для этой команды товары пока не назначены. Добавьте команду в карточке товара через панель управления.</p>`;
}

$("#teamProducts").addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  addToCart(products.find((product) => String(product.id) === String(button.dataset.add)));
});

Promise.all([getJson("/api/settings"), getJson(`/api/products?team=${encodeURIComponent(slug)}`)])
  .then(([loadedSettings, loadedProducts]) => { settings = loadedSettings; products = loadedProducts; renderTeam(); renderProducts(); updateCartCount(); })
  .catch((error) => { $("#teamProducts").innerHTML = `<p class="page-message">${escapeHtml(error.message)}</p>`; });
