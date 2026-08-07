const API = window.F1_CONFIG.API_URL;
let tg = null;

function connectTelegram() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp || tg === webApp) return;
  tg = webApp;
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.("#101216");
  tg.setBackgroundColor?.("#101216");
}

window.addEventListener("telegram-web-app-ready", connectTelegram);
connectTelegram();

const FALLBACKS = {
  poster: "assets/fallback-poster.webp",
  constructor: "assets/fallback-constructor.webp",
  apparel: "assets/fallback-apparel.webp",
};

let settings = {};
let categories = [];
let subcategories = [];
let products = [];
let currentCategory = "weekly";
let currentSubcategory = "all";
let currentProduct = null;
let cart = [];
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
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

function asset(url) {
  if (!url) return "";
  return url.startsWith("http") || url.startsWith("data:") ? url : `${API}${url}`;
}

function fallbackFor(product) {
  const category = categories.find((item) => String(item.id) === String(product.category_id));
  const context = `${category?.name || ""} ${product.title || ""}`.toLowerCase();
  if (/одеж|футбол|худи|shirt|apparel/.test(context)) return FALLBACKS.apparel;
  if (/lego|лего|конструкт|technic|speed champions/.test(context)) return FALLBACKS.constructor;
  return FALLBACKS.poster;
}

function productImage(product) {
  return asset(product.image) || fallbackFor(product);
}

function declension(number, words) {
  const value = Math.abs(number) % 100;
  const last = value % 10;
  if (value > 10 && value < 20) return words[2];
  if (last > 1 && last < 5) return words[1];
  if (last === 1) return words[0];
  return words[2];
}

async function getJson(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Не удалось связаться с магазином");
  }
  return response.json();
}

function normalizeManagerUrl() {
  const raw = settings.manager_url || settings.manager_username || window.F1_CONFIG.BOT_USERNAME || "F1posters_mng";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://t.me/${String(raw).replace(/^@/, "")}`;
}

function telegramUser() {
  const user = tg?.initDataUnsafe?.user;
  return user ? {
    id: user.id,
    username: user.username || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
  } : {};
}

function restoreCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("f1-posters-cart") || "[]");
    cart = saved.map((item) => {
      const product = products.find((candidate) => String(candidate.id) === String(item.product_id));
      if (!product) return null;
      return {
        product_id: product.id,
        title: product.title,
        price: product.price,
        quantity: Math.min(99, Math.max(1, Number(item.quantity) || 1)),
        image: product.image,
        category_id: product.category_id,
      };
    }).filter(Boolean);
  } catch {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem("f1-posters-cart", JSON.stringify(cart));
}

async function init() {
  [settings, categories, subcategories, products] = await Promise.all([
    getJson("/api/settings"),
    getJson("/api/categories"),
    getJson("/api/subcategories"),
    getJson("/api/products"),
  ]);

  restoreCart();
  renderSettings();
  renderTabs();
  renderSubtabs();
  renderProducts();
  renderCart();
  initReveal();
}

function renderSettings() {
  const shopName = cleanCopy(settings.shop_name || "F1 Posters");
  const firstWord = shopName.split(/\s+/)[0] || "F1";
  $("#shopName").textContent = firstWord;
  $("#bannerText").textContent = cleanCopy(settings.banner_text) || "Постеры, конструкторы, одежда и кастомные иллюстрации для тех, кто замечает каждую деталь гонки.";
  $("#deliveryText").textContent = cleanCopy(settings.delivery_text) || "Пункты выдачи Озон и Яндекс Маркет по России";
  $("#heroProductCount").textContent = String(products.length).padStart(2, "0");
  $("#heroCategoryCount").textContent = String(categories.length).padStart(2, "0");
  document.title = `${shopName} — гоночные постеры и коллекционные вещи`;

  const managerUrl = normalizeManagerUrl();
  ["managerLink", "customManagerLink", "footerManagerLink"].forEach((id) => {
    const link = $(`#${id}`);
    if (link) link.href = managerUrl;
  });
}

function categoryLabel(categoryId) {
  return cleanCopy(categories.find((item) => String(item.id) === String(categoryId))?.name || "Коллекция");
}

function activeCollectionLabel() {
  if (currentCategory === "weekly") return "Скидки недели";
  if (currentCategory === "all") return "Весь каталог";
  return categoryLabel(currentCategory);
}

function renderTabs() {
  const tabs = [
    { id: "weekly", name: "Скидки недели" },
    { id: "all", name: "Все товары" },
    ...categories.map((category) => ({ id: category.id, name: cleanCopy(category.name) })),
  ];

  $("#tabs").innerHTML = tabs.map((tab) => `
    <button class="category-tab ${String(tab.id) === String(currentCategory) ? "active" : ""}"
      type="button" role="tab" aria-selected="${String(tab.id) === String(currentCategory)}" data-category="${escapeHtml(tab.id)}">
      ${escapeHtml(tab.name)}
    </button>
  `).join("");
}

function renderSubtabs() {
  const element = $("#subtabs");
  const visible = subcategories.filter((subcategory) => String(subcategory.category_id) === String(currentCategory));
  element.classList.toggle("hidden", currentCategory === "weekly" || currentCategory === "all" || visible.length === 0);
  element.innerHTML = [
    `<button class="subcategory-tab ${currentSubcategory === "all" ? "active" : ""}" type="button" data-subcategory="all">Все</button>`,
    ...visible.map((subcategory) => `
      <button class="subcategory-tab ${String(subcategory.id) === String(currentSubcategory) ? "active" : ""}"
        type="button" data-subcategory="${subcategory.id}">${escapeHtml(cleanCopy(subcategory.name))}</button>
    `),
  ].join("");
}

function filteredProducts() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const visible = products.filter((product) => {
    const categoryOk = currentCategory === "weekly"
      ? product.is_weekly_discount
      : currentCategory === "all" || String(product.category_id) === String(currentCategory);
    const subcategoryOk = currentCategory === "weekly" || currentCategory === "all" || currentSubcategory === "all"
      || String(product.subcategory_id) === String(currentSubcategory);
    const searchContext = cleanCopy(`${product.title} ${product.description} ${categoryLabel(product.category_id)}`).toLowerCase();
    return categoryOk && subcategoryOk && (!query || searchContext.includes(query));
  });

  const sort = $("#sortSelect").value;
  if (sort === "price-asc") visible.sort((a, b) => Number(a.price) - Number(b.price));
  if (sort === "price-desc") visible.sort((a, b) => Number(b.price) - Number(a.price));
  if (sort === "name") visible.sort((a, b) => cleanCopy(a.title).localeCompare(cleanCopy(b.title), "ru"));
  return visible;
}

function renderProducts() {
  const visible = filteredProducts();
  $("#activeCollection").textContent = activeCollectionLabel();
  $("#resultCount").textContent = `${visible.length} ${declension(visible.length, ["позиция", "позиции", "позиций"])}`;

  $("#products").innerHTML = visible.map((product, index) => {
    const title = cleanCopy(product.title);
    const fallback = fallbackFor(product);
    return `
      <article class="product-card reveal">
        <button class="product-card__media" type="button" data-product="${product.id}" aria-label="Открыть ${escapeHtml(title)}">
          <span class="product-card__lap">P${String(index + 1).padStart(2, "0")}</span>
          ${product.is_weekly_discount ? `<span class="discount-flag">Скидка недели</span>` : ""}
          <img src="${escapeHtml(productImage(product))}" data-fallback="${fallback}" alt="${escapeHtml(title)}" loading="lazy" />
        </button>
        <div class="product-card__body">
          <p class="product-card__category">${escapeHtml(categoryLabel(product.category_id))}</p>
          <h3>${escapeHtml(title)}</h3>
          <button class="product-card__buy" type="button" data-add-product="${product.id}" aria-label="Добавить ${escapeHtml(title)} в корзину" title="Добавить в корзину">+</button>
          <div class="price-row"><strong>${money(product.price)}</strong>${product.old_price ? `<s>${money(product.old_price)}</s>` : ""}</div>
        </div>
      </article>
    `;
  }).join("") || `
    <div class="empty-state">
      <strong>В этом секторе пока нет товаров</strong>
      <span>Попробуйте другую категорию или измените запрос</span>
    </div>
  `;

  observeReveals($("#products"));
}

function openProduct(id) {
  currentProduct = products.find((product) => String(product.id) === String(id));
  if (!currentProduct) return;
  const image = $("#productImage");
  image.src = productImage(currentProduct);
  image.dataset.fallback = fallbackFor(currentProduct);
  image.alt = cleanCopy(currentProduct.title);
  $("#productCode").textContent = `${categoryLabel(currentProduct.category_id)} / P${String(currentProduct.id).padStart(3, "0")}`;
  $("#productTitle").textContent = cleanCopy(currentProduct.title);
  $("#productDescription").textContent = cleanCopy(currentProduct.description) || "Подробности по этой позиции можно уточнить у менеджера.";
  $("#productPrice").textContent = money(currentProduct.price);
  $("#productOldPrice").textContent = currentProduct.old_price ? money(currentProduct.old_price) : "";
  openDialog($("#productDialog"));
}

function addProduct(product, quantity = 1) {
  const existing = cart.find((item) => String(item.product_id) === String(product.id));
  if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
  else cart.push({
    product_id: product.id,
    title: product.title,
    price: product.price,
    quantity,
    image: product.image,
    category_id: product.category_id,
  });
  renderCart();
  showToast(`${cleanCopy(product.title)} добавлен в корзину`);
}

function addCurrentProduct() {
  if (!currentProduct) return;
  addProduct(currentProduct);
  closeDialog($("#productDialog"));
}

function cartTotals() {
  return {
    count: cart.reduce((sum, item) => sum + item.quantity, 0),
    total: cart.reduce((sum, item) => sum + item.quantity * item.price, 0),
  };
}

function renderCart() {
  saveCart();
  const { count, total } = cartTotals();
  $("#headerCartCount").textContent = count;
  $("#cartCount").textContent = `${count} ${declension(count, ["товар", "товара", "товаров"])}`;
  $("#cartTotal").textContent = money(total);
  $("#cartSheetTotal").textContent = money(total);
  $("#checkoutTotal").textContent = money(total);
  $("#mobileCart").classList.toggle("visible", count > 0);
  $("#checkout").disabled = count === 0;

  $("#cartItems").innerHTML = cart.map((item, index) => {
    const fallback = fallbackFor(item);
    return `
      <article class="cart-item">
        <img src="${escapeHtml(asset(item.image) || fallback)}" data-fallback="${fallback}" alt="${escapeHtml(cleanCopy(item.title))}" />
        <div class="cart-item__copy"><strong>${escapeHtml(cleanCopy(item.title))}</strong><small>${money(item.price)} за шт.</small></div>
        <div class="quantity-control" aria-label="Количество товара">
          <button type="button" data-qty="${index}" data-delta="-1" aria-label="Уменьшить количество">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-qty="${index}" data-delta="1" aria-label="Увеличить количество">+</button>
        </div>
      </article>
    `;
  }).join("") || `<div class="empty-state"><strong>Корзина пуста</strong><span>Добавьте товары из каталога</span></div>`;
}

function openCart() {
  clearTimeout(toastTimer);
  $("#toast").classList.remove("visible");
  $("#cartDrawer").classList.add("visible");
  $("#cartDrawer").setAttribute("aria-hidden", "false");
  $("#drawerBackdrop").classList.add("visible");
  document.body.classList.add("locked");
  $("#closeCart").focus();
}

function closeCart() {
  $("#cartDrawer").classList.remove("visible");
  $("#cartDrawer").setAttribute("aria-hidden", "true");
  $("#drawerBackdrop").classList.remove("visible");
  if (!$("dialog[open]")) document.body.classList.remove("locked");
}

function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
  document.body.classList.add("locked");
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
  if (!$("dialog[open]") && !$("#cartDrawer").classList.contains("visible")) document.body.classList.remove("locked");
}

function showToast(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 2600);
}

function setCategory(category) {
  currentCategory = String(category);
  currentSubcategory = "all";
  renderTabs();
  renderSubtabs();
  renderProducts();
}

function initReveal() {
  observeReveals(document);
  if (!("IntersectionObserver" in window)) $$(".reveal").forEach((element) => element.classList.add("visible"));
}

function observeReveals(root) {
  const elements = [...root.querySelectorAll(".reveal:not(.visible)")];
  if (!elements.length) return;
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    elements.forEach((element) => element.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -35px" });
  elements.forEach((element) => observer.observe(element));
}

function initSectorNavigation() {
  if (!("IntersectionObserver" in window)) return;
  const links = $$('[data-sector]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.classList.toggle("active", link.dataset.sector === entry.target.id));
    });
  }, { threshold: 0.35 });
  [$("#catalog"), $("#delivery")].forEach((section) => observer.observe(section));
}

$("#tabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (button) setCategory(button.dataset.category);
});

$("#subtabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-subcategory]");
  if (!button) return;
  currentSubcategory = button.dataset.subcategory;
  renderSubtabs();
  renderProducts();
});

$("#products").addEventListener("click", (event) => {
  const productButton = event.target.closest("[data-product]");
  const addButton = event.target.closest("[data-add-product]");
  if (productButton) openProduct(productButton.dataset.product);
  if (addButton) {
    const product = products.find((item) => String(item.id) === String(addButton.dataset.addProduct));
    if (product) addProduct(product);
  }
});

$("#searchInput").addEventListener("input", renderProducts);
$("#sortSelect").addEventListener("change", renderProducts);
$("#addToCart").addEventListener("click", addCurrentProduct);
[$("#headerCart"), $("#mobileCartButton"), $("#sectorCart")].forEach((button) => button.addEventListener("click", openCart));
$("#closeCart").addEventListener("click", closeCart);
$("#drawerBackdrop").addEventListener("click", closeCart);

$("#cartItems").addEventListener("click", (event) => {
  const control = event.target.closest("[data-qty]");
  if (!control) return;
  const index = Number(control.dataset.qty);
  const item = cart[index];
  if (!item) return;
  item.quantity = Math.min(99, item.quantity + Number(control.dataset.delta));
  if (item.quantity <= 0) cart.splice(index, 1);
  renderCart();
});

$("#checkout").addEventListener("click", () => {
  if (!cart.length) return;
  closeCart();
  openDialog($("#checkoutDialog"));
});

$$('[data-dialog-close]').forEach((button) => {
  button.addEventListener("click", () => closeDialog($(`#${button.dataset.dialogClose}`)));
});

$$('dialog').forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
  dialog.addEventListener("close", () => {
    if (!$("dialog[open]") && !$("#cartDrawer").classList.contains("visible")) document.body.classList.remove("locked");
  });
});

$$('[data-nav-category]').forEach((link) => {
  link.addEventListener("click", () => setCategory(link.dataset.navCategory));
});

$("#menuToggle").addEventListener("click", () => {
  const open = $("#menuToggle").getAttribute("aria-expanded") === "true";
  $("#menuToggle").setAttribute("aria-expanded", String(!open));
  $("#primaryNav").classList.toggle("open", !open);
});

$("#primaryNav").addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  $("#menuToggle").setAttribute("aria-expanded", "false");
  $("#primaryNav").classList.remove("open");
});

document.addEventListener("error", (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.dataset.fallback || image.src.endsWith(image.dataset.fallback)) return;
  image.src = image.dataset.fallback;
}, true);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("#cartDrawer").classList.contains("visible")) closeCart();
});

$("#checkoutForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = Object.fromEntries(new FormData(formElement).entries());
  const user = telegramUser();
  const payload = {
    ...form,
    initData: tg?.initData || "",
    telegram_user: user,
    username: form.username || user.username || "",
    items: cart.map(({ product_id, quantity }) => ({ product_id, quantity })),
  };
  const submit = formElement.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "Отправляем";
  try {
    const order = await getJson("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    cart = [];
    renderCart();
    formElement.reset();
    closeDialog($("#checkoutDialog"));
    $("#orderSuccessText").textContent = `Спасибо за покупку. Заказ #${order.id} отправлен администратору. Он отдельно рассчитает стоимость товаров и доставки, затем свяжется с вами по указанным контактам.`;
    openDialog($("#successDialog"));
  } catch (error) {
    tg?.showAlert ? tg.showAlert(error.message) : showToast(error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = "Отправить заказ";
  }
});

$("#year").textContent = new Date().getFullYear();
initSectorNavigation();
init().catch((error) => {
  $("#products").innerHTML = `<div class="empty-state"><strong>Каталог временно недоступен</strong><span>${escapeHtml(error.message)}</span></div>`;
  showToast(error.message);
});
