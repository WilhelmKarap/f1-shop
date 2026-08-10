const API = window.F1_CONFIG.API_URL;
let tg = null;

function connectTelegram() {
  const webApp = window.Telegram?.WebApp;
  const telegramContext = document.documentElement.classList.contains("telegram-mode") || Boolean(webApp?.initData) || Boolean(window.TelegramWebviewProxy);
  if (!webApp || !telegramContext || tg === webApp) return;
  tg = webApp;
  document.documentElement.classList.add("telegram-mode");
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.("#07111f");
  tg.setBackgroundColor?.("#07111f");
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

const DEFAULT_COPY = {
  site_nav_catalog: "Каталог",
  site_nav_weekly: "Скидки недели",
  site_nav_delivery: "Доставка",
  site_nav_contact: "Связаться",
  site_cart_label: "Пит-стоп",
  site_hero_kicker_1: "Коллекция 2026",
  site_hero_kicker_2: "Печать и детали",
  site_hero_title_top: "F1",
  site_hero_title_bottom: "Posters",
  site_hero_text: "Постеры, конструкторы, одежда и кастомные иллюстрации для тех, кто замечает каждую деталь гонки.",
  site_hero_primary_cta: "Выйти на старт",
  site_hero_weekly_cta: "Скидки недели",
  site_metric_products: "Товары",
  site_metric_categories: "Категории",
  site_metric_delivery: "Доставка",
  site_metric_delivery_value: "ПВЗ",
  site_weekly_category: "Скидки недели",
  site_all_category: "Все товары",
  site_search_label: "Поиск",
  site_search_placeholder: "Название, команда или пилот",
  site_mobile_category_label: "Категория",
  site_mobile_subcategory_label: "Подкатегория",
  site_sort_label: "Порядок",
  site_sort_default: "По умолчанию",
  site_sort_price_asc: "Сначала дешевле",
  site_sort_price_desc: "Сначала дороже",
  site_sort_name: "По названию",
  site_all_subcategory: "Все",
  site_discount_badge: "Скидка недели",
  site_add_to_cart: "Добавить в корзину",
  site_empty_title: "В этом секторе пока нет товаров",
  site_empty_text: "Попробуйте другую категорию или измените запрос",
  site_delivery_kicker: "От корзины до получения",
  site_delivery_title: "Спокойный круг после финиша.",
  site_delivery_step1_title: "Оформите заказ",
  site_delivery_step1_text: "Укажите телефон, службу выдачи и точный адрес выбранного ПВЗ.",
  site_delivery_step2_title: "Получите расчёт",
  site_delivery_step2_text: "Администратор отдельно рассчитает товары и доставку, затем свяжется с вами.",
  site_delivery_step3_title: "Подтвердите оплату",
  site_delivery_step3_text: "Оплата доступна по QR-коду или ссылке после подтверждения состава заказа.",
  site_delivery_route_label: "Маршрут",
  site_finish_kicker: "Не нашли нужный сюжет?",
  site_finish_title: "Соберём постер под вашу идею.",
  site_finish_button: "Обсудить с менеджером",
  site_cart_title: "Корзина",
  site_cart_empty_title: "Корзина пуста",
  site_cart_empty_text: "Добавьте товары из каталога",
  site_cart_total_label: "Товары",
  site_cart_delivery_note: "Стоимость доставки администратор рассчитает отдельно.",
  site_checkout_delivery_note: "Доставка будет рассчитана отдельно",
  site_checkout_button: "Оформить заказ",
  site_checkout_kicker: "Финальный сектор",
  site_checkout_title: "Оформление заказа",
  site_checkout_intro: "После отправки администратор рассчитает стоимость доставки и свяжется с вами.",
  site_field_name: "ФИО",
  site_field_phone: "Телефон",
  site_field_telegram: "Telegram для связи",
  site_field_provider: "Пункт выдачи",
  site_field_address: "Адрес ПВЗ Озон/Яндекс Маркет",
  site_field_comment: "Комментарий",
  site_optional_label: "необязательно",
  site_provider_placeholder: "Выберите службу",
  site_provider_ozon: "Озон",
  site_provider_yandex: "Яндекс Маркет",
  site_submit_order: "Отправить заказ",
  site_success_kicker: "Финиш",
  site_success_title: "Заказ принят",
  site_success_text: "Спасибо за покупку. Заказ #{id} отправлен администратору. Он отдельно рассчитает стоимость товаров и доставки, затем свяжется с вами по указанным контактам.",
  site_success_button: "Вернуться в каталог",
  site_footer_tagline: "Постеры, конструкторы и авторские работы о скорости.",
  site_footer_manager: "Менеджер",
  site_footer_admin: "Управление",
  site_teams_kicker: "Паддок 2026",
  site_teams_title: "Команды",
  site_teams_text: "Выберите команду и найдите постеры, LEGO-работы и вещи с её характером.",
  site_categories_kicker: "Коллекции",
  site_categories_title: "Выберите свой формат",
  site_categories_text: "Постеры, конструкторы, одежда и авторские иллюстрации с темпом гоночного уикенда.",
  site_discounts_kicker: "Текущий круг",
  site_discounts_title: "Скидки недели",
  site_discounts_button: "Смотреть все",
  site_custom_kicker: "Своя траектория",
  site_custom_title: "Кастомные работы",
  site_custom_text: "Выберите готовую основу или расскажите идею менеджеру: формат, команду, пилота и настроение работы.",
  site_social_kicker: "Вне трассы",
  site_social_title: "Следите за новыми работами",
  site_social_tiktok: "TikTok",
  site_social_instagram: "Instagram",
  site_product_kicker: "Коллекция F1 Posters",
  site_custom_product_button: "Оставить заявку",
  site_price_on_request: "Цена по запросу",
};

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

function siteCopy(key) {
  const legacyValue = key === "site_hero_text" ? settings.banner_text : "";
  return cleanCopy(settings[key] || legacyValue || DEFAULT_COPY[key] || "");
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
  return asset(product.cover_image || product.image) || fallbackFor(product);
}

function productDetailImage(product) {
  return asset(product.main_image || product.cover_image || product.image) || fallbackFor(product);
}

function teamConfig(slug) {
  return window.F1_TEAM_BY_SLUG?.[slug] || window.F1_TEAM_BY_SLUG?.other || null;
}

function teamMedia(slug, type) {
  return asset(settings[`team_${slug}_${type}`]);
}

function teamStyle(team) {
  if (!team?.colors) return "";
  const { primary, secondary, accent, dark, light } = team.colors;
  return `--team-primary:${primary};--team-secondary:${secondary};--team-accent:${accent};--team-dark:${dark};--team-light:${light};`;
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

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""), location.href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : normalizeManagerUrl();
  } catch {
    return normalizeManagerUrl();
  }
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
        image: product.cover_image || product.image,
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
  renderPremiumSections();
  renderProducts();
  renderCart();
  initReveal();
}

function renderSettings() {
  const shopName = cleanCopy(settings.shop_name || "F1 Posters");
  $$('[data-setting]').forEach((element) => {
    const value = siteCopy(element.dataset.setting);
    if (value) element.textContent = value;
  });
  $$('[data-setting-placeholder]').forEach((element) => {
    const value = siteCopy(element.dataset.settingPlaceholder);
    if (value) element.placeholder = value;
  });
  $("#bannerText").textContent = siteCopy("site_hero_text");
  $("#deliveryText").textContent = cleanCopy(settings.delivery_text) || "Пункты выдачи Озон и Яндекс Маркет по России";
  $("#heroProductCount").textContent = String(products.length).padStart(2, "0");
  $("#heroCategoryCount").textContent = String(categories.length).padStart(2, "0");
  document.title = `${shopName} — гоночные постеры и коллекционные вещи`;

  const telegramMode = document.documentElement.classList.contains("telegram-mode");
  const heroSetting = telegramMode
    ? settings.telegram_hero_image || settings.banner_image || settings.web_hero_image
    : settings.web_hero_image || settings.banner_image;
  if (heroSetting) $("#heroImage").src = asset(heroSetting);

  const deliveryBackground = asset(settings.delivery_background_image);
  const finishBackground = asset(settings.finish_background_image);
  document.documentElement.style.setProperty("--delivery-background-image", deliveryBackground ? `url(${JSON.stringify(deliveryBackground)})` : "none");
  document.documentElement.style.setProperty("--finish-background-image", finishBackground ? `url(${JSON.stringify(finishBackground)})` : "none");

  const managerUrl = normalizeManagerUrl();
  ["managerLink", "customManagerLink", "customSectionManagerLink", "footerManagerLink"].forEach((id) => {
    const link = $(`#${id}`);
    if (link) link.href = managerUrl;
  });
}

function premiumProductCard(product, index, kind = "standard") {
  const title = cleanCopy(product.title);
  const team = teamConfig(product.team);
  const isCustom = Boolean(product.is_custom);
  const price = isCustom
    ? `${siteCopy("site_price_on_request")}${product.custom_price ? ` · ${money(product.custom_price)}` : ""}`
    : money(product.price);
  const action = isCustom ? siteCopy("site_custom_product_button") : "+";
  const category = team?.name || categoryLabel(product.category_id);
  return `<article class="premium-product reveal" style="--reveal-delay:${Math.min(index, 7) * 45}ms">
    <button class="premium-product__media" type="button" data-product="${product.id}" aria-label="Открыть ${escapeHtml(title)}">
      ${product.is_weekly_discount && kind !== "custom" ? `<span class="premium-product__flag">${escapeHtml(siteCopy("site_discount_badge"))}</span>` : ""}
      <img src="${escapeHtml(productImage(product))}" data-fallback="${fallbackFor(product)}" alt="${escapeHtml(title)}" loading="lazy" />
    </button>
    <div class="premium-product__body"><span>${escapeHtml(category)}</span><h3>${escapeHtml(title)}</h3>
      <div class="price-row"><strong>${escapeHtml(price)}</strong>${!isCustom && product.old_price ? `<s>${money(product.old_price)}</s>` : ""}</div>
      <button class="premium-product__add" type="button" data-${isCustom ? "product" : "add-product"}="${product.id}" aria-label="${escapeHtml(action)}: ${escapeHtml(title)}" title="${escapeHtml(action)}">${escapeHtml(action)}</button>
    </div>
  </article>`;
}

function renderHeroCarousel() {
  const host = $("#heroPosterCarousel");
  if (!host) return;
 const source = products.filter((product) => product.is_weekly_discount).concat(products.filter((product) => !product.is_weekly_discount)).slice(0, 5);
  const center = Math.floor(source.length / 2);
  host.innerHTML = source.map((product, index) => `<button class="poster-carousel__card" type="button" data-product="${product.id}" data-position="${index - center}" aria-label="Открыть ${escapeHtml(cleanCopy(product.title))}"><img src="${escapeHtml(productImage(product))}" data-fallback="${fallbackFor(product)}" alt="" /><span>${escapeHtml(cleanCopy(product.title))}</span></button>`).join("");
  if (source.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    clearInterval(host.carouselTimer);
    let active = center;
    host.carouselTimer = setInterval(() => {
      active = (active + 1) % source.length;
      [...host.children].forEach((card, index) => {
        let position = index - active;
        if (position < -2) position += source.length;
        if (position > 2) position -= source.length;
        card.dataset.position = String(position);
      });
    }, 4200);
  }
}

function renderTeamGrid() {
  const host = $("#teamGrid");
  if (!host) return;
  const teams = window.F1_TEAMS || [];
  host.innerHTML = teams.map((team, index) => {
    const background = teamMedia(team.slug, "background");
    const foreground = teamMedia(team.slug, "foreground");
    const logo = teamMedia(team.slug, "logo");
    return `<a class="team-card" href="team.html?team=${encodeURIComponent(team.slug)}" style="${teamStyle(team)}">
      ${background ? `<img class="team-card__background" src="${escapeHtml(background)}" alt="" />` : ""}
      ${foreground ? `<img class="team-card__foreground" src="${escapeHtml(foreground)}" alt="" />` : ""}
      <div class="team-card__top">${logo ? `<img class="team-card__logo" src="${escapeHtml(logo)}" alt="${escapeHtml(team.name)}" />` : "<span></span>"}<span class="team-card__number">${String(index + 1).padStart(2, "0")}</span></div>
      <div><h3>${escapeHtml(team.name)}</h3>${team.drivers?.length ? `<small>${escapeHtml(team.drivers.join(" · "))}</small>` : ""}</div>
    </a>`;
  }).join("");
}

function renderCategoryShowcase() {
  const host = $("#categoryShowcaseGrid");
  if (!host) return;
  host.innerHTML = categories.map((category) => {
    const representative = products.find((product) => String(product.category_id) === String(category.id));
    const image = asset(category.image) || (representative ? productImage(representative) : FALLBACKS.poster);
    return `<button class="category-tile" type="button" data-category-showcase="${category.id}"><img src="${escapeHtml(image)}" data-fallback="${fallbackFor(representative || {})}" alt="${escapeHtml(cleanCopy(category.name))}" loading="lazy" /><span class="category-tile__copy"><span>${escapeHtml(cleanCopy(category.description || "Коллекция"))}</span><strong>${escapeHtml(cleanCopy(category.name))}</strong></span></button>`;
  }).join("");
}

function renderPremiumSections() {
  renderHeroCarousel();
  renderTeamGrid();
  renderCategoryShowcase();
  const weekly = products.filter((product) => product.is_weekly_discount).slice(0, 4);
  const custom = products.filter((product) => product.is_custom).slice(0, 4);
  $("#discountGrid").innerHTML = weekly.map((product, index) => premiumProductCard(product, index, "weekly")).join("") || `<p class="muted-empty">Скоро здесь появятся новые предложения.</p>`;
  $("#customGrid").innerHTML = custom.map((product, index) => premiumProductCard(product, index, "custom")).join("") || `<p class="muted-empty">Кастомные работы добавляются через панель управления.</p>`;
  renderSocialGrid();
  observeReveals(document);
}

function renderSocialGrid() {
  const host = $("#socialGrid");
  if (!host) return;
  const social = [
    { key: "tiktok", label: siteCopy("site_social_tiktok"), url: settings.social_tiktok_url, background: settings.social_tiktok_background, foreground: settings.social_tiktok_foreground },
    { key: "instagram", label: siteCopy("site_social_instagram"), url: settings.social_instagram_url, background: settings.social_instagram_background, foreground: settings.social_instagram_foreground },
  ];
  host.innerHTML = social.map((item) => `<a class="social-card" href="${escapeHtml(safeExternalUrl(item.url))}" target="_blank" rel="noopener noreferrer">
    ${item.background ? `<img class="social-card__background" src="${escapeHtml(asset(item.background))}" alt="" loading="lazy" />` : ""}
    ${item.foreground ? `<img class="social-card__foreground" src="${escapeHtml(asset(item.foreground))}" alt="" loading="lazy" />` : ""}
    <span class="social-card__copy"><span>${escapeHtml(siteCopy("site_social_kicker"))}</span><strong>${escapeHtml(item.label)}</strong></span>
  </a>`).join("");
}

function categoryLabel(categoryId) {
  return cleanCopy(categories.find((item) => String(item.id) === String(categoryId))?.name || "Коллекция");
}

function activeCollectionLabel() {
  if (currentCategory === "weekly") return siteCopy("site_weekly_category");
  if (currentCategory === "all") return siteCopy("site_all_category");
  return categoryLabel(currentCategory);
}

function renderTabs() {
  const tabs = [
    { id: "weekly", name: siteCopy("site_weekly_category") },
    { id: "all", name: siteCopy("site_all_category") },
    ...categories.map((category) => ({ id: category.id, name: cleanCopy(category.name) })),
  ];

  $("#tabs").innerHTML = tabs.map((tab) => `
    <button class="category-tab ${String(tab.id) === String(currentCategory) ? "active" : ""}"
      type="button" role="tab" aria-selected="${String(tab.id) === String(currentCategory)}" data-category="${escapeHtml(tab.id)}">
      ${escapeHtml(tab.name)}
    </button>
  `).join("");

  $("#telegramCategorySelect").innerHTML = tabs.map((tab) => `
    <option value="${escapeHtml(tab.id)}" ${String(tab.id) === String(currentCategory) ? "selected" : ""}>${escapeHtml(tab.name)}</option>
  `).join("");
}

function renderSubtabs() {
  const element = $("#subtabs");
  const visible = subcategories.filter((subcategory) => String(subcategory.category_id) === String(currentCategory));
  element.classList.toggle("hidden", currentCategory === "weekly" || currentCategory === "all" || visible.length === 0);
  element.innerHTML = [
    `<button class="subcategory-tab ${currentSubcategory === "all" ? "active" : ""}" type="button" data-subcategory="all">${escapeHtml(siteCopy("site_all_subcategory"))}</button>`,
    ...visible.map((subcategory) => `
      <button class="subcategory-tab ${String(subcategory.id) === String(currentSubcategory) ? "active" : ""}"
        type="button" data-subcategory="${subcategory.id}">${escapeHtml(cleanCopy(subcategory.name))}</button>
    `),
  ].join("");

  const telegramField = $("#telegramSubcategoryField");
  const hasSubcategories = currentCategory !== "weekly" && currentCategory !== "all" && visible.length > 0;
  telegramField.classList.toggle("hidden", !hasSubcategories);
  $(".telegram-filters").classList.toggle("has-subcategories", hasSubcategories);
  $("#telegramSubcategorySelect").innerHTML = [
    `<option value="all">${escapeHtml(siteCopy("site_all_subcategory"))}</option>`,
    ...visible.map((subcategory) => `<option value="${subcategory.id}" ${String(subcategory.id) === String(currentSubcategory) ? "selected" : ""}>${escapeHtml(cleanCopy(subcategory.name))}</option>`),
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
    const custom = Boolean(product.is_custom);
    const price = custom ? `${siteCopy("site_price_on_request")}${product.custom_price ? ` · ${money(product.custom_price)}` : ""}` : money(product.price);
   return `
      <article class="product-card reveal reveal--clip" style="--reveal-delay:${Math.min(index, 7) * 45}ms">
        <button class="product-card__media" type="button" data-product="${product.id}" aria-label="Открыть ${escapeHtml(title)}">
          <span class="product-card__lap">P${String(index + 1).padStart(2, "0")}</span>
          ${product.is_weekly_discount ? `<span class="discount-flag">${escapeHtml(siteCopy("site_discount_badge"))}</span>` : ""}
          <img src="${escapeHtml(productImage(product))}" data-fallback="${fallback}" alt="${escapeHtml(title)}" loading="lazy" />
        </button>
        <div class="product-card__body">
          <p class="product-card__category">${escapeHtml(categoryLabel(product.category_id))}</p>
          <h3>${escapeHtml(title)}</h3>
          <button class="product-card__buy" type="button" data-${custom ? "product" : "add-product"}="${product.id}" aria-label="${escapeHtml(custom ? siteCopy("site_custom_product_button") : siteCopy("site_add_to_cart"))}: ${escapeHtml(title)}" title="${escapeHtml(custom ? siteCopy("site_custom_product_button") : siteCopy("site_add_to_cart"))}">${custom ? "?" : "+"}</button>
          <div class="price-row"><strong>${escapeHtml(price)}</strong>${!custom && product.old_price ? `<s>${money(product.old_price)}</s>` : ""}</div>
        </div>
      </article>
    `;
  }).join("") || `
    <div class="empty-state">
      <strong>${escapeHtml(siteCopy("site_empty_title"))}</strong>
      <span>${escapeHtml(siteCopy("site_empty_text"))}</span>
    </div>
  `;

  observeReveals($("#products"));
}

function openProduct(id) {
  currentProduct = products.find((product) => String(product.id) === String(id));
  if (!currentProduct) return;
  const image = $("#productImage");
  image.src = productDetailImage(currentProduct);
  image.dataset.fallback = fallbackFor(currentProduct);
  image.alt = cleanCopy(currentProduct.title);
  $("#productCode").textContent = `${teamConfig(currentProduct.team)?.name || categoryLabel(currentProduct.category_id)} / P${String(currentProduct.id).padStart(3, "0")}`;
  $("#productTitle").textContent = cleanCopy(currentProduct.title);
  $("#productDescription").textContent = cleanCopy(currentProduct.description) || "Подробности по этой позиции можно уточнить у менеджера.";
  $("#productPrice").textContent = currentProduct.is_custom ? `${siteCopy("site_price_on_request")}${currentProduct.custom_price ? ` · ${money(currentProduct.custom_price)}` : ""}` : money(currentProduct.price);
  $("#productOldPrice").textContent = !currentProduct.is_custom && currentProduct.old_price ? money(currentProduct.old_price) : "";
  $("#addToCart").textContent = currentProduct.is_custom ? siteCopy("site_custom_product_button") : siteCopy("site_add_to_cart");
  openDialog($("#productDialog"));
}

function addProduct(product, quantity = 1) {
  if (product.is_custom) {
    window.open(normalizeManagerUrl(), "_blank", "noopener");
    return;
  }
  const existing = cart.find((item) => String(item.product_id) === String(product.id));
  if (existing) existing.quantity = Math.min(99, existing.quantity + quantity);
  else cart.push({
    product_id: product.id,
    title: product.title,
    price: product.price,
    quantity,
    image: product.cover_image || product.image,
    category_id: product.category_id,
  });
  renderCart();
  showToast(`${cleanCopy(product.title)} добавлен в корзину`);
}

function addCurrentProduct() {
  if (!currentProduct) return;
  if (currentProduct.is_custom) {
    window.open(normalizeManagerUrl(), "_blank", "noopener");
    closeDialog($("#productDialog"));
    return;
  }
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
  }).join("") || `<div class="empty-state"><strong>${escapeHtml(siteCopy("site_cart_empty_title"))}</strong><span>${escapeHtml(siteCopy("site_cart_empty_text"))}</span></div>`;
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

function initMotion() {
  const root = document.documentElement;
  const hero = $(".hero");
  const header = $(".site-header");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frame = 0;
  let previousY = window.scrollY;

  const update = () => {
    frame = 0;
    const y = window.scrollY;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const heroProgress = Math.min(1, Math.max(0, y / Math.max(1, hero.offsetHeight)));
    root.style.setProperty("--page-progress", String(y / maxScroll));
    root.style.setProperty("--hero-progress", String(heroProgress));
    root.style.setProperty("--scroll-direction", String(Math.sign(y - previousY)));
    header.classList.toggle("scrolled", y > 24);
    previousY = y;
  };

  const requestUpdate = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  update();
  addEventListener("scroll", requestUpdate, { passive: true });
  addEventListener("resize", requestUpdate, { passive: true });

  const telegramMode = root.classList.contains("telegram-mode");
  if (reducedMotion || telegramMode || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  $$(".magnetic, .header-cart").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
      const yOffset = ((event.clientY - rect.top) / rect.height - 0.5) * 8;
      element.style.setProperty("--magnetic-x", `${x.toFixed(2)}px`);
      element.style.setProperty("--magnetic-y", `${yOffset.toFixed(2)}px`);
    });
    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--magnetic-x", "0px");
      element.style.setProperty("--magnetic-y", "0px");
    });
  });
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

$("#telegramCategorySelect").addEventListener("change", (event) => setCategory(event.target.value));
$("#telegramSubcategorySelect").addEventListener("change", (event) => {
  currentSubcategory = event.target.value;
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

[$("#heroPosterCarousel"), $("#discountGrid"), $("#customGrid")].filter(Boolean).forEach((host) => {
  host.addEventListener("click", (event) => {
    const productButton = event.target.closest("[data-product]");
    const addButton = event.target.closest("[data-add-product]");
    if (productButton) openProduct(productButton.dataset.product);
    if (addButton) {
      const product = products.find((item) => String(item.id) === String(addButton.dataset.addProduct));
      if (product) addProduct(product);
    }
  });
});

$("#categoryShowcaseGrid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category-showcase]");
  if (!button) return;
  setCategory(button.dataset.categoryShowcase);
  $("#catalog").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
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
    $("#orderSuccessText").textContent = siteCopy("site_success_text").replaceAll("{id}", order.id);
    openDialog($("#successDialog"));
  } catch (error) {
    tg?.showAlert ? tg.showAlert(error.message) : showToast(error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = siteCopy("site_submit_order");
  }
});

$("#year").textContent = new Date().getFullYear();
initSectorNavigation();
initMotion();
init().catch((error) => {
  $("#products").innerHTML = `<div class="empty-state"><strong>Каталог временно недоступен</strong><span>${escapeHtml(error.message)}</span></div>`;
  showToast(error.message);
});
