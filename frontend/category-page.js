const API = window.F1_CONFIG.API_URL;
const FALLBACK = "assets/fallback-poster.webp";
const categoryId = new URLSearchParams(location.search).get("id");
let category = null;
let subcategories = [];
let products = [];
let settings = {};
let activeSubcategory = "all";
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const asset = (url) => url ? (/^(https?:|data:)/.test(url) ? url : `${API}${url}`) : "";
const money = (value) => `${new Intl.NumberFormat("ru-RU").format(Number(value) || 0)} ₽`;
const cleanCopy = (value = "") => String(value).replace(/\p{Extended_Pictographic}/gu, "").replace(/[\u200d\ufe0f]/g, "").replace(/[ \t]{2,}/g, " ").trim();
const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

async function getJson(path) {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Не удалось загрузить категорию");
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
  const cart = getCart();
  const item = cart.find((entry) => String(entry.product_id) === String(product.id));
  if (item) item.quantity = Math.min(99, (Number(item.quantity) || 0) + 1);
  else cart.push({ product_id: product.id, title: product.title, price: product.price, quantity: 1, image: product.cover_image || product.image, category_id: product.category_id });
  localStorage.setItem("f1-posters-cart", JSON.stringify(cart));
  updateCartCount();
  clearTimeout(toastTimer);
  $("#toast").textContent = `${cleanCopy(product.title)} добавлен в корзину`;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 2400);
}

function renderHeader() {
  $("#categoryName").textContent = cleanCopy(category.name);
  $("#categoryDescription").textContent = cleanCopy(category.description || "Коллекция работ, собранная в одном направлении.");
  $("#categoryCode").textContent = String(category.id).padStart(2, "0");
  $("#managerLink").href = managerUrl();
  const representativeImage = products.find((product) => product.main_image || product.cover_image || product.image);
  const fallbackImage = representativeImage ? asset(representativeImage.main_image || representativeImage.cover_image || representativeImage.image) : "";
  if (category.image || fallbackImage) {
    $("#categoryImage").src = asset(category.image) || fallbackImage;
    $("#categoryImage").alt = cleanCopy(category.name);
    $("#categoryImage").classList.remove("hidden");
    $("#categoryImage").onerror = () => {
      if (fallbackImage && $("#categoryImage").src !== fallbackImage) $("#categoryImage").src = fallbackImage;
      else $("#categoryImage").classList.add("hidden");
    };
  }
  document.title = `${cleanCopy(category.name)} | F1 Posters`;
}

function renderSubnav() {
  const items = [{ id: "all", name: "Все" }, ...subcategories];
  $("#categorySubnav").innerHTML = items.map((item) => `<button class="${String(item.id) === String(activeSubcategory) ? "active" : ""}" type="button" data-subcategory="${item.id}">${escapeHtml(cleanCopy(item.name))}</button>`).join("");
}

function productMedia(product, title) {
  const cover = asset(product.cover_image || product.image) || FALLBACK;
  const main = asset(product.main_image || product.cover_image || product.image) || FALLBACK;
  return `<img class="page-product-card__cover" src="${escapeHtml(cover)}" onerror="this.src='${FALLBACK}'" alt="${escapeHtml(title)}" loading="lazy" />
    <img class="page-product-card__main" src="${escapeHtml(main)}" onerror="this.src='${FALLBACK}'" alt="" loading="lazy" />`;
}

function renderProducts() {
  const visible = activeSubcategory === "all" ? products : products.filter((product) => String(product.subcategory_id) === String(activeSubcategory));
  const currentSubcategory = subcategories.find((item) => String(item.id) === String(activeSubcategory));
  $("#categoryProductCount").textContent = `${visible.length} товаров`;
  $("#categoryListingTitle").textContent = currentSubcategory ? cleanCopy(currentSubcategory.name) : "Все работы";
  $("#categoryProducts").innerHTML = visible.map((product) => {
    const title = cleanCopy(product.title);
    const custom = Boolean(product.is_custom);
    const customPrice = product.custom_price ? `От ${money(product.custom_price)}` : "Цена по запросу";
    return `<article class="page-product-card">
      <a class="page-product-card__media" href="product.html?id=${product.id}">${productMedia(product, title)}</a>
      <div class="page-product-card__body"><small>${escapeHtml(cleanCopy(category.name))}</small><h3>${escapeHtml(title)}</h3>
        ${custom ? `<div class="page-custom-price" data-price-control><button type="button" data-reveal-price>Узнать цену</button><strong class="hidden">${escapeHtml(customPrice)}</strong><a class="hidden" href="${escapeHtml(managerUrl())}" target="_blank" rel="noreferrer">Обсудить с менеджером</a></div>` : `<strong>${money(product.price)}</strong><button type="button" data-add="${product.id}" aria-label="Добавить в корзину">+</button>`}
      </div>
    </article>`;
  }).join("") || `<p class="page-message">В этой подкатегории товары пока не добавлены.</p>`;
}

$("#categorySubnav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-subcategory]");
  if (!button) return;
  activeSubcategory = button.dataset.subcategory;
  const url = new URL(location.href);
  if (activeSubcategory === "all") url.searchParams.delete("subcategory");
  else url.searchParams.set("subcategory", activeSubcategory);
  history.replaceState({}, "", url);
  renderSubnav();
  renderProducts();
});

$("#categoryProducts").addEventListener("click", (event) => {
  const add = event.target.closest("[data-add]");
  if (add) {
    const product = products.find((item) => String(item.id) === String(add.dataset.add));
    if (product) addToCart(product);
  }
  const reveal = event.target.closest("[data-reveal-price]");
  if (reveal) {
    const control = reveal.closest("[data-price-control]");
    reveal.classList.add("hidden");
    control.querySelector("strong").classList.remove("hidden");
    control.querySelector("a").classList.remove("hidden");
  }
});

Promise.all([
  getJson("/api/settings"),
  getJson("/api/categories"),
  getJson(`/api/subcategories?category_id=${encodeURIComponent(categoryId || "")}`),
  getJson(`/api/products?category_id=${encodeURIComponent(categoryId || "")}`),
]).then(([settingsData, categoryData, subcategoryData, productData]) => {
  settings = settingsData;
  category = categoryData.find((item) => String(item.id) === String(categoryId));
  if (!category) throw new Error("Категория не найдена");
  subcategories = subcategoryData;
  products = productData;
  const requested = new URLSearchParams(location.search).get("subcategory");
  activeSubcategory = requested && subcategories.some((item) => String(item.id) === String(requested)) ? requested : "all";
  renderHeader();
  renderSubnav();
  renderProducts();
  updateCartCount();
}).catch((error) => {
  $("#categoryProducts").innerHTML = `<p class="page-message">${escapeHtml(error.message)}</p>`;
});
