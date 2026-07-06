const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const store = window.F1ShopStore;
const moneyFormat = new Intl.NumberFormat("ru-RU");

let catalog = store.getCatalog();
let settings = store.getSettings();
let currentCategory = "weekly";
let currentProduct = null;
let selectedOption = "";
let cart = [];
let pendingOrder = null;
let telegramMainButtonBound = false;

const screens = [...document.querySelectorAll(".screen")];
const navButtons = [...document.querySelectorAll(".nav-button[data-target]")];
const categoryTabs = document.querySelector("#categoryTabs");
const categoryBanner = document.querySelector("#categoryBanner");
const productList = document.querySelector("#productList");
const productDetail = document.querySelector("#productDetail");
const searchInput = document.querySelector("#searchInput");
const cartCount = document.querySelector("#cartCount");
const cartItems = document.querySelector("#cartItems");
const cartTotal = document.querySelector("#cartTotal");
const checkoutSubtotal = document.querySelector("#checkoutSubtotal");
const checkoutTotal = document.querySelector("#checkoutTotal");
const paymentQr = document.querySelector("#paymentQr");
const paymentAmount = document.querySelector("#paymentAmount");
const orderText = document.querySelector("#orderText");

function money(value) {
  return `${moneyFormat.format(value || 0)} ₽`;
}

function productById(id) {
  return catalog.products.find((product) => product.id === id);
}

function categoryById(id) {
  return catalog.categories.find((category) => category.id === id) || catalog.categories[0];
}

function optionPrice(option) {
  const match = String(option || "").match(/\+(\d[\d\s]*)\s*₽/);
  return match ? Number(match[1].replace(/\s/g, "")) : 0;
}

function itemPrice(product, option) {
  return Number(product.price || 0) + optionPrice(option);
}

function showScreen(id) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.id === id));
  navButtons.forEach((button) => button.classList.toggle("active", button.dataset.target === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateTelegramButton(id);
}

function updateTelegramButton(screenId) {
  if (!tg?.MainButton) return;
  if (telegramMainButtonBound) {
    tg.MainButton.offClick(addCurrentProduct);
    telegramMainButtonBound = false;
  }
  tg.MainButton.hide();
  if (screenId === "productScreen") {
    tg.MainButton.setText("Добавить в корзину");
    tg.MainButton.show();
    tg.MainButton.onClick(addCurrentProduct);
    telegramMainButtonBound = true;
  }
}

function imageMarkup(src, alt, className) {
  return `<img class="${className}" src="${src}" alt="${alt}" loading="lazy" />`;
}

function renderProfile() {
  const user = tg?.initDataUnsafe?.user;
  const name = user?.first_name || user?.username || "Гость";
  document.querySelector("#profileName").textContent = name;
  document.querySelector("#profileStatus").textContent = user
    ? `Авторизован через Telegram, id ${user.id}`
    : "Откройте магазин внутри Telegram для авторизации";

  const photo = document.querySelector("#accountPhoto");
  if (user?.photo_url) {
    photo.style.backgroundImage = `url("${user.photo_url}")`;
  }
  if (user?.username) {
    document.querySelector("#telegramInput").value = `@${user.username}`;
  }
}

function renderCategories() {
  categoryTabs.innerHTML = catalog.categories.map((category) => `
    <button class="category-tab ${category.id === currentCategory ? "active" : ""}" type="button" data-category="${category.id}">
      ${category.title}
    </button>
  `).join("");

  const category = categoryById(currentCategory);
  categoryBanner.innerHTML = `
    ${imageMarkup(category.image, category.title, "category-banner__image")}
    <div class="category-banner__text">
      <strong>${category.title}</strong>
      <span>${category.subtitle || ""}</span>
    </div>
  `;
}

function visibleProducts() {
  const query = searchInput.value.trim().toLowerCase();
  return catalog.products.filter((product) => {
    const byCategory = currentCategory === "weekly" ? product.weeklyDeal : product.categoryId === currentCategory;
    const bySearch = !query || `${product.title} ${product.description}`.toLowerCase().includes(query);
    return byCategory && bySearch;
  });
}

function renderProducts() {
  const products = visibleProducts();
  productList.innerHTML = products.map((product) => `
    <button class="product-card" type="button" data-product="${product.id}">
      ${imageMarkup(product.image, product.title, "product-card__image")}
      <span class="product-info">
        <span class="product-info__category">${categoryById(product.categoryId).title}</span>
        <h3>${product.title}</h3>
        <span class="price-line">
          <strong>${money(product.price)}</strong>
          ${product.oldPrice ? `<s>${money(product.oldPrice)}</s>` : ""}
        </span>
      </span>
    </button>
  `).join("") || `<div class="empty-state">В этой вкладке пока нет товаров. Добавьте их в редакторе.</div>`;
}

function openProduct(id) {
  currentProduct = productById(id);
  selectedOption = currentProduct.options?.[0] || "Без варианта";
  renderProductDetail();
  showScreen("productScreen");
}

function renderProductDetail() {
  const options = currentProduct.options?.length ? currentProduct.options : ["Без варианта"];
  productDetail.innerHTML = `
    ${imageMarkup(currentProduct.image, currentProduct.title, "detail-image")}
    <h3 class="detail-title">${currentProduct.title}</h3>
    <div class="price-box">
      <span>${money(currentProduct.price)}</span>
      ${currentProduct.oldPrice ? `<s>${money(currentProduct.oldPrice)}</s>` : ""}
    </div>
    <section class="option-box">
      <h3>Вариант</h3>
      ${options.map((option, index) => `
        <label class="option-row">
          <span><input type="radio" name="option" value="${option}" ${index === 0 ? "checked" : ""}> ${option}</span>
          <span>${optionPrice(option) ? `+${money(optionPrice(option))}` : "+0 ₽"}</span>
        </label>
      `).join("")}
    </section>
    <section class="description-box">
      <h3>Описание</h3>
      <p>${currentProduct.description || ""}</p>
      <ul>${(currentProduct.bullets || []).map((bullet) => `<li>${bullet}</li>`).join("")}</ul>
    </section>
    <button class="primary-button" id="addToCartButton" type="button">Добавить в корзину</button>
  `;
}

function addCurrentProduct() {
  const optionInput = document.querySelector("input[name='option']:checked");
  selectedOption = optionInput?.value || selectedOption;
  const existing = cart.find((item) => item.id === currentProduct.id && item.option === selectedOption);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: currentProduct.id, option: selectedOption, qty: 1 });
  }
  renderCart();
  showScreen("cartScreen");
}

function cartSum() {
  return cart.reduce((sum, item) => {
    const product = productById(item.id);
    return sum + itemPrice(product, item.option) * item.qty;
  }, 0);
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCount.textContent = count;
  cartTotal.textContent = money(cartSum());
  checkoutSubtotal.textContent = money(cartSum());
  checkoutTotal.textContent = money(cartSum());

  if (!cart.length) {
    cartItems.innerHTML = `<div class="empty-state">Корзина пока пустая. Выберите товар в каталоге.</div>`;
    document.querySelector("#checkoutButton").disabled = true;
    return;
  }

  document.querySelector("#checkoutButton").disabled = false;
  cartItems.innerHTML = cart.map((item, index) => {
    const product = productById(item.id);
    return `
      <article class="cart-item">
        ${imageMarkup(product.image, product.title, "cart-thumb")}
        <div>
          <div class="cart-title">${product.title}</div>
          <div class="cart-options">Вариант: ${item.option}</div>
          <strong class="price">${money(itemPrice(product, item.option))}</strong>
          <div class="qty-row" data-index="${index}">
            <button type="button" data-action="minus">-</button>
            <span>${item.qty} шт.</span>
            <button type="button" data-action="plus">+</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function telegramUser() {
  const user = tg?.initDataUnsafe?.user;
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.first_name || "",
    lastName: user.last_name || "",
    username: user.username || "",
  };
}

function buildOrder(form) {
  const data = new FormData(form);
  const items = cart.map((item) => {
    const product = productById(item.id);
    return {
      title: product.title,
      category: categoryById(product.categoryId).title,
      option: item.option,
      qty: item.qty,
      price: itemPrice(product, item.option),
    };
  });
  const total = cartSum();
  return {
    id: `F1-${Date.now().toString().slice(-8)}`,
    createdAt: new Date().toLocaleString("ru-RU"),
    status: "Ожидает подтверждения оплаты",
    total,
    customer: {
      name: data.get("name"),
      phone: data.get("phone"),
      email: data.get("email"),
      address: data.get("address"),
      telegram: data.get("telegram"),
      telegramUser: telegramUser(),
    },
    promo: data.get("promo") || "",
    items,
  };
}

function orderToText(order) {
  const lines = order.items.map((item) => `${item.title} — ${item.option}, ${item.qty} шт. x ${money(item.price)}`);
  return [
    `Заказ ${order.id}`,
    `Статус: ${order.status}`,
    "",
    ...lines,
    "",
    `Итого: ${money(order.total)}`,
    `ФИО: ${order.customer.name}`,
    `Телефон: ${order.customer.phone}`,
    `Email: ${order.customer.email || "не указан"}`,
    `Доставка: ${order.customer.address}`,
    `Telegram: ${order.customer.telegram || "не указан"}`,
    `Промокод: ${order.promo || "нет"}`,
  ].join("\n");
}

function openPayment(order) {
  pendingOrder = order;
  paymentQr.src = settings.paymentQr;
  paymentAmount.textContent = money(order.total);
  showScreen("paymentScreen");
}

async function sendOrderToServer(order) {
  if (!location.protocol.startsWith("http")) return;
  await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order, initData: tg?.initData || "" }),
  }).catch(() => {});
}

async function completeOrder() {
  if (!pendingOrder) return;
  store.addOrder(pendingOrder);
  await sendOrderToServer(pendingOrder);
  orderText.value = orderToText(pendingOrder);
  document.querySelector("#successText").textContent = `Номер заказа: ${pendingOrder.id}. Статус: ожидает подтверждения оплаты.`;
  cart = [];
  renderCart();
  showScreen("successScreen");
}

document.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-category]");
  const productButton = event.target.closest("[data-product]");
  const addButton = event.target.closest("#addToCartButton");
  const qtyButton = event.target.closest(".qty-row button");

  if (categoryButton) {
    currentCategory = categoryButton.dataset.category;
    renderCategories();
    renderProducts();
  }

  if (productButton) {
    openProduct(productButton.dataset.product);
  }

  if (addButton) {
    addCurrentProduct();
  }

  if (qtyButton) {
    const row = qtyButton.closest(".qty-row");
    const item = cart[Number(row.dataset.index)];
    item.qty += qtyButton.dataset.action === "plus" ? 1 : -1;
    if (item.qty <= 0) cart = cart.filter((candidate) => candidate !== item);
    renderCart();
  }
});

document.querySelector("#backToHome").addEventListener("click", () => showScreen("homeScreen"));
document.querySelector("#backFromCart").addEventListener("click", () => showScreen("homeScreen"));
document.querySelector("#backFromCheckout").addEventListener("click", () => showScreen("cartScreen"));
document.querySelector("#backFromPayment").addEventListener("click", () => showScreen("checkoutScreen"));
document.querySelector("#cartOpenButton").addEventListener("click", () => showScreen("cartScreen"));
document.querySelector("#checkoutButton").addEventListener("click", () => showScreen("checkoutScreen"));
document.querySelector("#paidButton").addEventListener("click", completeOrder);
document.querySelector("#startAgainButton").addEventListener("click", () => showScreen("homeScreen"));

document.querySelector("#checkoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  openPayment(buildOrder(event.currentTarget));
});

document.querySelector("#copyOrderButton").addEventListener("click", async () => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(orderText.value);
  } else {
    orderText.select();
    document.execCommand("copy");
  }
  tg?.showAlert?.("Заявка скопирована");
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.target === "cartScreen") renderCart();
    showScreen(button.dataset.target);
  });
});

searchInput.addEventListener("input", renderProducts);

renderProfile();
renderCategories();
renderProducts();
renderCart();
