const API = window.F1_CONFIG.API_URL;
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

let settings = {};
let categories = [];
let subcategories = [];
let products = [];
let currentCategory = "weekly";
let currentSubcategory = "all";
let currentProduct = null;
let cart = [];

const $ = (selector) => document.querySelector(selector);
const money = (value) => `${new Intl.NumberFormat("ru-RU").format(value || 0)} ₽`;
const asset = (url) => url ? (url.startsWith("http") || url.startsWith("data:") ? url : `${API}${url}`) : "";

async function getJson(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Ошибка запроса");
  return res.json();
}

async function init() {
  [settings, categories, subcategories, products] = await Promise.all([
    getJson("/api/settings"),
    getJson("/api/categories"),
    getJson("/api/subcategories"),
    getJson("/api/products"),
  ]);
  renderSettings();
  renderTabs();
  renderSubtabs();
  renderProducts();
  renderCart();
}

function renderSettings() {
  $("#shopName").textContent = settings.shop_name || "F1 Constructor Shop";
  $("#bannerText").textContent = settings.banner_text || "";
  if (settings.logo_image) {
    $("#logo").src = asset(settings.logo_image);
    $("#logo").classList.remove("hidden");
  }
  if (settings.banner_image) {
    $("#heroImage").src = asset(settings.banner_image);
    $("#heroImage").classList.remove("hidden");
  }
}

function renderTabs() {
  $("#tabs").innerHTML = [
    `<button class="tab ${currentCategory === "weekly" ? "active" : ""}" data-category="weekly">Скидки недели</button>`,
    ...categories.map((c) => `<button class="tab ${String(c.id) === String(currentCategory) ? "active" : ""}" data-category="${c.id}">${c.name}</button>`),
  ].join("");
}

function renderSubtabs() {
  const element = $("#subtabs");
  const visible = subcategories.filter((subcategory) => String(subcategory.category_id) === String(currentCategory));
  element.classList.toggle("hidden", currentCategory === "weekly" || visible.length === 0);
  element.innerHTML = [
    `<button class="tab ${currentSubcategory === "all" ? "active" : ""}" data-subcategory="all">Все</button>`,
    ...visible.map((subcategory) => `<button class="tab ${String(subcategory.id) === String(currentSubcategory) ? "active" : ""}" data-subcategory="${subcategory.id}">${subcategory.name}</button>`),
  ].join("");
}

function filteredProducts() {
  const query = $("#searchInput").value.trim().toLowerCase();
  return products.filter((p) => {
    const categoryOk = currentCategory === "weekly" ? p.is_weekly_discount : String(p.category_id) === String(currentCategory);
    const subcategoryOk = currentCategory === "weekly" || currentSubcategory === "all" || String(p.subcategory_id) === String(currentSubcategory);
    const searchOk = !query || `${p.title} ${p.description}`.toLowerCase().includes(query);
    return categoryOk && subcategoryOk && searchOk;
  });
}

function renderProducts() {
  const visible = filteredProducts();
  $("#products").innerHTML = visible.map((p) => `
    <button class="card" data-product="${p.id}">
      <img src="${asset(p.image)}" alt="${p.title}" />
      <span class="card-body">
        ${p.is_weekly_discount ? `<span class="badge">Скидка недели</span>` : ""}
        <strong>${p.title}</strong>
        <span class="price-row"><b>${money(p.price)}</b>${p.old_price ? `<s>${money(p.old_price)}</s>` : ""}</span>
      </span>
    </button>
  `).join("") || `<div class="empty-state">Товары не найдены</div>`;
}

function openProduct(id) {
  currentProduct = products.find((p) => String(p.id) === String(id));
  $("#productImage").src = asset(currentProduct.image);
  $("#productTitle").textContent = currentProduct.title;
  $("#productDescription").textContent = currentProduct.description || "";
  $("#productPrice").textContent = money(currentProduct.price);
  $("#productOldPrice").textContent = currentProduct.old_price ? money(currentProduct.old_price) : "";
  openOverlay("productOverlay");
}

function addToCart() {
  const item = cart.find((x) => x.product_id === currentProduct.id);
  if (item) item.quantity += 1;
  else cart.push({ product_id: currentProduct.id, title: currentProduct.title, price: currentProduct.price, quantity: 1, image: currentProduct.image });
  closeOverlay("productOverlay");
  renderCart();
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  $("#cartCount").textContent = `${count} товаров`;
  $("#cartTotal").textContent = money(total);
  $("#cartSheetTotal").textContent = money(total);
  $("#cartBar").classList.toggle("visible", count > 0);
  $("#checkout").disabled = count === 0;
  $("#cartItems").innerHTML = cart.map((item, index) => `
    <div class="cart-item">
      <img src="${asset(item.image)}" alt="${item.title}" />
      <div class="grow"><strong>${item.title}</strong><small>${money(item.price)}</small></div>
      <div class="qty">
        <button data-qty="${index}" data-delta="-1" type="button">-</button>
        <span>${item.quantity}</span>
        <button data-qty="${index}" data-delta="1" type="button">+</button>
      </div>
    </div>
  `).join("") || `<div class="empty-state">Корзина пуста</div>`;
}

function openOverlay(id) { $(`#${id}`).classList.add("visible"); }
function closeOverlay(id) { $(`#${id}`).classList.remove("visible"); }

function telegramUser() {
  const user = tg?.initDataUnsafe?.user;
  return user ? { id: user.id, username: user.username || "", first_name: user.first_name || "", last_name: user.last_name || "" } : {};
}

$("#tabs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-category]");
  if (!btn) return;
  currentCategory = btn.dataset.category;
  currentSubcategory = "all";
  renderTabs();
  renderSubtabs();
  renderProducts();
});
$("#subtabs").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-subcategory]");
  if (!btn) return;
  currentSubcategory = btn.dataset.subcategory;
  renderSubtabs();
  renderProducts();
});
$("#products").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-product]");
  if (btn) openProduct(btn.dataset.product);
});
$("#searchInput").addEventListener("input", renderProducts);
$("#addToCart").addEventListener("click", addToCart);
$("#openCart").addEventListener("click", () => openOverlay("cartOverlay"));
$("#checkout").addEventListener("click", () => openOverlay("checkoutOverlay"));
document.addEventListener("click", (e) => {
  const close = e.target.closest("[data-close]");
  if (close) closeOverlay(close.dataset.close);
  const qty = e.target.closest("[data-qty]");
  if (qty) {
    const item = cart[Number(qty.dataset.qty)];
    item.quantity += Number(qty.dataset.delta);
    if (item.quantity <= 0) cart.splice(Number(qty.dataset.qty), 1);
    renderCart();
  }
});

$("#checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.currentTarget).entries());
  const payload = {
    ...form,
    initData: tg?.initData || "",
    telegram_user: telegramUser(),
    username: telegramUser().username || "",
    items: cart.map(({ product_id, title, price, quantity }) => ({ product_id, title, price, quantity })),
  };
  const submit = e.currentTarget.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const order = await getJson("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    cart = [];
    renderCart();
    e.currentTarget.reset();
    closeOverlay("checkoutOverlay");
    closeOverlay("cartOverlay");
    $("#orderSuccessText").textContent = `Заказ #${order.id} отправлен администратору. Скоро администратор рассчитает доставку и отправит реквизиты для оплаты: QR-код и номер карты.`;
    openOverlay("orderSuccessOverlay");
  } catch (error) {
    tg?.showAlert ? tg.showAlert(error.message) : alert(error.message);
  } finally {
    submit.disabled = false;
  }
});

init().catch((error) => {
  $("#products").innerHTML = `<div class="empty-state">${error.message}</div>`;
});
