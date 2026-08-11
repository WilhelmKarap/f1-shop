const API = window.F1_CONFIG.API_URL;
let token = localStorage.getItem("admin_token") || "";
let categories = [];
let subcategories = [];
let products = [];
let orders = [];
let settings = {};
let currentOrderId = null;
const teams = window.F1_TEAMS || [];

const SITE_COPY_DEFAULTS = {
  site_nav_catalog: "Каталог", site_nav_categories: "Категории", site_nav_weekly: "Скидки недели", site_nav_social: "Соцсети", site_nav_delivery: "Доставка", site_nav_contact: "Связаться", site_cart_label: "Пит-стоп",
  site_hero_kicker_1: "Коллекция 2026", site_hero_kicker_2: "Печать и детали", site_hero_title_top: "F1", site_hero_title_bottom: "Posters",
  site_hero_text: "Постеры, конструкторы, одежда и кастомные иллюстрации для тех, кто замечает каждую деталь гонки.", site_hero_primary_cta: "Выйти на старт", site_hero_weekly_cta: "Скидки недели",
  site_metric_products: "Товары", site_metric_categories: "Категории", site_metric_delivery: "Доставка", site_metric_delivery_value: "ПВЗ",
  site_weekly_category: "Скидки недели", site_all_category: "Все товары", site_search_label: "Поиск", site_search_placeholder: "Название, команда или пилот",
  site_mobile_category_label: "Категория", site_mobile_subcategory_label: "Подкатегория", site_sort_label: "Порядок", site_sort_default: "По умолчанию",
  site_sort_price_asc: "Сначала дешевле", site_sort_price_desc: "Сначала дороже", site_sort_name: "По названию", site_all_subcategory: "Все",
  site_discount_badge: "Скидка недели", site_add_to_cart: "Добавить в корзину", site_empty_title: "В этом секторе пока нет товаров", site_empty_text: "Попробуйте другую категорию или измените запрос",
  site_delivery_kicker: "От корзины до получения", site_delivery_title: "Спокойный круг после финиша.", site_delivery_step1_title: "Оформите заказ",
  site_delivery_step1_text: "Укажите телефон, службу выдачи и точный адрес выбранного ПВЗ.", site_delivery_step2_title: "Получите расчёт",
  site_delivery_step2_text: "Администратор отдельно рассчитает товары и доставку, затем свяжется с вами.", site_delivery_step3_title: "Подтвердите оплату",
  site_delivery_step3_text: "Оплата доступна по QR-коду или ссылке после подтверждения состава заказа.", site_delivery_route_label: "Маршрут",
  site_finish_kicker: "Не нашли нужный сюжет?", site_finish_title: "Соберём постер под вашу идею.", site_finish_button: "Обсудить с менеджером",
  site_cart_title: "Корзина", site_cart_empty_title: "Корзина пуста", site_cart_empty_text: "Добавьте товары из каталога", site_cart_total_label: "Товары",
  site_cart_delivery_note: "Стоимость доставки администратор рассчитает отдельно.", site_checkout_delivery_note: "Доставка будет рассчитана отдельно", site_checkout_button: "Оформить заказ",
  site_checkout_kicker: "Финальный сектор", site_checkout_title: "Оформление заказа", site_checkout_intro: "После отправки администратор рассчитает стоимость доставки и свяжется с вами.",
  site_field_name: "ФИО", site_field_phone: "Телефон", site_field_telegram: "Telegram для связи", site_field_provider: "Пункт выдачи",
  site_field_address: "Адрес ПВЗ Озон/Яндекс Маркет", site_field_comment: "Комментарий", site_optional_label: "необязательно",
  site_provider_placeholder: "Выберите службу", site_provider_ozon: "Озон", site_provider_yandex: "Яндекс Маркет", site_submit_order: "Отправить заказ",
  site_success_kicker: "Финиш", site_success_title: "Заказ принят",
  site_success_text: "Спасибо за покупку. Заказ #{id} отправлен администратору. Он отдельно рассчитает стоимость товаров и доставки, затем свяжется с вами по указанным контактам.",
  site_success_button: "Вернуться в каталог", site_footer_tagline: "Постеры, конструкторы и авторские работы о скорости.", site_footer_manager: "Менеджер", site_footer_admin: "Управление",
  site_teams_kicker: "Паддок 2026", site_teams_title: "Команды", site_teams_text: "Выберите команду и найдите постеры, LEGO-работы и вещи с её характером.",
  site_categories_kicker: "Коллекции", site_categories_title: "Выберите свой формат", site_categories_text: "Постеры, конструкторы, одежда и авторские иллюстрации с темпом гоночного уикенда.",
  site_discounts_kicker: "Текущий круг", site_discounts_title: "Скидки недели", site_discounts_button: "Смотреть все",
  site_custom_kicker: "Своя траектория", site_custom_title: "Кастомные работы", site_custom_text: "Выберите готовую основу или расскажите идею менеджеру: формат, команду, пилота и настроение работы.",
  site_social_kicker: "Вне трассы", site_social_title: "Следите за новыми работами", site_social_tiktok: "TikTok", site_social_instagram: "Instagram", site_social_open_profile: "Открыть профиль",
  site_product_kicker: "Коллекция F1 Posters", site_custom_product_button: "Оставить заявку", site_price_on_request: "Цена по запросу",
};

const $ = (s) => document.querySelector(s);
const money = (v) => `${new Intl.NumberFormat("ru-RU").format(v || 0)} ₽`;
const asset = (url) => url ? (url.startsWith("http") ? url : `${API}${url}`) : "";
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });
const escapeHtml = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  alert(event.reason?.message || "Не удалось выполнить действие");
});

function resetSession() {
  token = "";
  localStorage.removeItem("admin_token");
  showLogin();
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
  if (res.status === 401 || res.status === 403) {
    resetSession();
    throw new Error("Сессия истекла. Войдите заново.");
  }
  if (res.status === 404 && path.startsWith("/api/subcategories")) {
    throw new Error("Backend не обновлен: маршруты подкатегорий отсутствуют. Выполните новый Deploy backend.");
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Ошибка запроса");
  return res.json();
}

async function upload(type, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/api/upload?type=${type}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  if (res.status === 401 || res.status === 403) {
    resetSession();
    throw new Error("Сессия истекла. Войдите заново.");
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Не удалось загрузить файл");
  return res.json();
}

async function downloadBackup() {
  const res = await fetch(`${API}/api/admin/backup`, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401 || res.status === 403) {
    resetSession();
    throw new Error("Сессия истекла. Войдите заново.");
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Не удалось скачать резервную копию");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `f1-shop-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function restoreBackup(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/api/admin/restore`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  if (res.status === 401 || res.status === 403) {
    resetSession();
    throw new Error("Сессия истекла. Войдите заново.");
  }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Не удалось восстановить резервную копию");
  return res.json();
}

function showLogin() {
  $("#loginScreen").classList.remove("hidden");
  $("#adminLayout").classList.add("hidden");
  $("#loginError").textContent = "";
}

function showAdmin() {
  $("#loginScreen").classList.add("hidden");
  $("#adminLayout").classList.remove("hidden");
  loadPage("dashboard");
}

async function checkSession() {
  if (!token) return showLogin();
  try {
    await api("/api/me");
    showAdmin();
  } catch {
    resetSession();
  }
}

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  $("#loginError").textContent = "";
  try {
    const data = await fetch(`${API}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: form.login.value,
        password: form.password.value,
      }),
    }).then(async (res) => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Неверный логин или пароль");
      return res.json();
    });
    token = data.token;
    localStorage.setItem("admin_token", token);
    form.password.value = "";
    showAdmin();
  } catch (error) {
    $("#loginError").textContent = error.message;
  }
});

function openOverlay(id) { $(`#${id}`).classList.add("visible"); }
function closeOverlay(id) { $(`#${id}`).classList.remove("visible"); }

async function loadPage(page) {
  document.querySelectorAll(".nav").forEach((n) => n.classList.toggle("active", n.dataset.page === page));
  document.querySelectorAll(".page").forEach((p) => p.classList.add("hidden"));
  $(`#page-${page}`).classList.remove("hidden");
  $("#pageTitle").textContent = document.querySelector(`.nav[data-page="${page}"]`)?.textContent || "CMS";
  if (page === "dashboard") await loadDashboard();
  if (page === "categories") await loadCategories();
  if (page === "subcategories") await loadSubcategories();
  if (page === "products") await loadProducts();
  if (page === "orders") await loadOrders();
  if (page === "weekly") await loadWeekly();
  if (page === "banners" || page === "content" || page === "settings" || page === "team-media") await loadSettings();
}

async function loadDashboard() {
  const s = await api("/api/stats");
  $("#statOrdersToday").textContent = s.ordersToday;
  $("#statRevenue").textContent = money(s.revenue);
  $("#statOrders").textContent = s.totalOrders;
  $("#statProducts").textContent = s.totalProducts || s.products || 0;
}

async function loadCategories() {
  categories = await api("/api/categories");
  $("#categoriesTable").innerHTML = categories.map((c) => `
    <tr><td><img class="thumb" src="${asset(c.image)}" /></td><td>${c.name}<small>${c.description || ""}</small></td><td>${c.sort_order}</td>
    <td><button onclick="editCategory(${c.id})">Изменить</button><button onclick="deleteCategory(${c.id})">Удалить</button></td></tr>
  `).join("");
  fillCategorySelect();
}

function fillCategorySelect() {
  $("#productForm [name=category_id]").innerHTML = categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  $("#subcategoryForm [name=category_id]").innerHTML = categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  fillSubcategorySelect();
  fillTeamSelect();
}

function fillTeamSelect() {
  const select = $("#productForm [name=team]");
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">Не указывать</option>${teams.map((team) => `<option value="${team.slug}">${team.name}</option>`).join("")}`;
  select.value = current;
}

function renderTeamMediaSlots() {
  const host = $("#teamMediaSlots");
  if (!host) return;
  host.innerHTML = teams.map((team) => {
    const key = `team_${team.slug}`;
    return `<article class="team-media-card"><h3>${team.name}</h3>
      <label class="field">Логотип<input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" data-upload="team-logos" data-target="${key}_logo" /><input name="${key}_logo" /></label>
      <label class="field">Фон<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="teams" data-target="${key}_background" data-original-target="${key}_background_original" /><input name="${key}_background" /><input name="${key}_background_original" type="hidden" /></label>
      <label class="field">Передний слой<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="teams" data-target="${key}_foreground" data-original-target="${key}_foreground_original" /><input name="${key}_foreground" /><input name="${key}_foreground_original" type="hidden" /></label>
      <label class="field">Масштаб слоя, %<input type="number" min="20" max="200" step="0.01" name="${key}_foreground_scale" value="${team.mediaAlignment?.scale ?? 100}" /></label>
      <label class="field">Сдвиг слоя по X, %<input type="number" min="-100" max="100" step="0.01" name="${key}_foreground_x" value="${team.mediaAlignment?.x ?? 0}" /></label>
      <label class="field">Сдвиг слоя по Y, %<input type="number" min="-100" max="100" step="0.01" name="${key}_foreground_y" value="${team.mediaAlignment?.y ?? 0}" /></label>
      <label class="field">Основание / Founded<textarea name="${key}_founded" rows="3">${escapeHtml(team.details?.founded || "")}</textarea></label>
      <label class="field">История / History<textarea name="${key}_history" rows="5">${escapeHtml(team.details?.history || "")}</textarea></label>
      <label class="field">Достижения / Achievements<textarea name="${key}_achievements" rows="4">${escapeHtml(team.details?.achievements || "")}</textarea></label>
      <label class="field">Легенды / Legends<textarea name="${key}_legends" rows="3">${escapeHtml(team.details?.legends || "")}</textarea></label>
    </article>`;
  }).join("");
}

function fillSubcategorySelect(selectedId = "") {
  const form = $("#productForm");
  const categoryId = form.category_id.value;
  const available = subcategories.filter((subcategory) => String(subcategory.category_id) === String(categoryId));
  form.subcategory_id.innerHTML = [
    `<option value="">Без подкатегории</option>`,
    ...available.map((subcategory) => `<option value="${subcategory.id}">${subcategory.name}</option>`),
  ].join("");
  form.subcategory_id.value = String(selectedId || "");
}

async function loadSubcategories() {
  if (!categories.length) await loadCategories();
  subcategories = await api("/api/subcategories");
  $("#subcategoriesTable").innerHTML = subcategories.map((subcategory) => {
    const category = categories.find((item) => item.id === subcategory.category_id);
    return `<tr><td><img class="thumb" src="${asset(subcategory.image)}" /></td><td>${subcategory.name}<small>${subcategory.description || ""}</small></td><td>${category?.name || ""}</td><td>${subcategory.sort_order}</td><td><button onclick="editSubcategory(${subcategory.id})">Изменить</button><button onclick="deleteSubcategory(${subcategory.id})">Удалить</button></td></tr>`;
  }).join("") || `<tr><td colspan="5">Подкатегорий пока нет</td></tr>`;
  fillSubcategorySelect();
}

async function loadProducts() {
  if (!categories.length) await loadCategories();
  if (!subcategories.length) subcategories = await api("/api/subcategories");
  products = await api("/api/products?admin=1");
  $("#productsTable").innerHTML = products.map((p) => {
    const category = categories.find((c) => c.id === p.category_id);
    const subcategory = subcategories.find((c) => c.id === p.subcategory_id);
    return `<tr><td><img class="thumb" src="${asset(p.cover_image || p.image)}" /></td><td>${p.title}<small>${[p.team, p.show_in_hero ? "Главная карусель" : "", p.is_custom ? "Кастом" : "", p.is_draft ? "Черновик" : ""].filter(Boolean).join(" · ")}</small></td><td>${category?.name || ""}</td><td>${subcategory?.name || "Без подкатегории"}</td><td>${p.is_custom ? "По запросу" : money(p.price)}</td><td>${p.is_available ? "В наличии" : "Нет в наличии"}</td><td><button onclick="editProduct(${p.id})">Изменить</button><button onclick="deleteProduct(${p.id})">Удалить</button></td></tr>`;
  }).join("");
}

async function loadWeekly() {
  if (!products.length) products = await api("/api/products?admin=1");
  $("#weeklyTable").innerHTML = products.filter((p) => p.is_weekly_discount).map((p) => `
    <tr><td><img class="thumb" src="${asset(p.cover_image || p.image)}" /></td><td>${p.title}</td><td>${p.is_custom ? "По запросу" : money(p.price)}</td><td><button onclick="editProduct(${p.id})">Изменить</button></td></tr>
  `).join("") || `<tr><td colspan="4">Скидок недели пока нет</td></tr>`;
}

async function loadOrders() {
  orders = await api("/api/orders");
  $("#ordersTable").innerHTML = orders.map((o) => `
    <tr><td>#${o.id}</td><td>${o.customer_name}<small>${o.username ? "@" + o.username : o.telegram_id}</small></td><td>${o.phone}</td><td>${money(o.total_price)}</td><td><span class="status">${labelStatus(o.status)}</span></td><td>${new Date(o.created_at).toLocaleString("ru-RU")}</td><td><button onclick="openOrder(${o.id})">Открыть</button></td></tr>
  `).join("");
}

function labelStatus(s) {
  return { new: "Новый, нужен расчет", awaiting_payment: "Реквизиты отправляются", awaiting_confirmation: "Ожидает подтверждения", paid: "Оплачен", shipped: "Отправлен", completed: "Завершен", cancelled: "Отменен" }[s] || s;
}

async function loadSettings() {
  settings = await api("/api/settings");
  renderTeamMediaSlots();
  for (const form of [$("#settingsForm"), $("#bannersForm"), $("#contentForm"), $("#teamMediaForm")]) {
    if (!form) continue;
    [...form.elements].forEach((el) => {
      if (el.name && settings[el.name] != null) el.value = settings[el.name];
      else if (form.id === "contentForm" && el.name && SITE_COPY_DEFAULTS[el.name] != null) el.value = SITE_COPY_DEFAULTS[el.name];
      else if (form.id === "teamMediaForm" && el.name) {
        const match = el.name.match(/^team_(.+)_(founded|history|achievements|legends)$/);
        const defaultTeam = match ? teams.find((team) => team.slug === match[1]) : null;
        if (defaultTeam?.details?.[match[2]]) el.value = defaultTeam.details[match[2]];
      }
    });
  }
}

window.editCategory = (id) => {
  const c = categories.find((x) => x.id === id);
  const f = $("#categoryForm");
  f.id.value = c.id; f.name.value = c.name; f.description.value = c.description || ""; f.image.value = c.image || ""; f.sort_order.value = c.sort_order || 0;
  openOverlay("categoryModal");
};

window.deleteCategory = async (id) => {
  if (!confirm("Удалить категорию?")) return;
  await api(`/api/categories/${id}`, { method: "DELETE" });
  loadCategories();
};

window.editSubcategory = async (id) => {
  if (!categories.length) await loadCategories();
  const subcategory = subcategories.find((item) => item.id === id);
  const form = $("#subcategoryForm");
  form.id.value = subcategory.id;
  form.category_id.value = subcategory.category_id;
  form.name.value = subcategory.name;
  form.description.value = subcategory.description || "";
  form.image.value = subcategory.image || "";
  form.sort_order.value = subcategory.sort_order || 0;
  openOverlay("subcategoryModal");
};

window.deleteSubcategory = async (id) => {
  if (!confirm("Удалить подкатегорию? Товары останутся в основной категории.")) return;
  await api(`/api/subcategories/${id}`, { method: "DELETE" });
  loadSubcategories();
};

window.editProduct = async (id) => {
  if (!categories.length) await loadCategories();
  if (!subcategories.length) subcategories = await api("/api/subcategories");
  const p = products.find((x) => x.id === id) || await api(`/api/products/${id}`);
  const f = $("#productForm");
  f.id.value = p.id; f.title.value = p.title; f.category_id.value = p.category_id || ""; f.description.value = p.description || "";
  fillSubcategorySelect(p.subcategory_id);
  fillTeamSelect();
  f.team.value = p.team || ""; f.price.value = p.price; f.old_price.value = p.old_price || ""; f.image.value = p.image || "";
  f.cover_image.value = p.cover_image || p.image || ""; f.main_image.value = p.main_image || p.image || "";
  f.original_cover_image.value = p.original_cover_image || ""; f.original_main_image.value = p.original_main_image || "";
  f.is_custom.checked = !!p.is_custom; f.custom_price.value = p.custom_price || ""; f.product_size.value = p.product_size || ""; f.lego_set.value = p.lego_set || ""; f.project_name.value = p.project_name || ""; f.custom_type.value = p.custom_type || ""; f.includes_frame.checked = !!p.includes_frame; f.includes_mount.checked = !!p.includes_mount;
  f.show_in_hero.checked = !!p.show_in_hero; f.is_weekly_discount.checked = !!p.is_weekly_discount; f.is_available.checked = !!p.is_available; f.is_draft.checked = !!p.is_draft; f.sort_order.value = p.sort_order || 0;
  openOverlay("productModal");
};

window.deleteProduct = async (id) => {
  if (!confirm("Удалить товар?")) return;
  await api(`/api/products/${id}`, { method: "DELETE" });
  loadProducts();
};

window.openOrder = (id) => {
  const o = orders.find((x) => x.id === id);
  currentOrderId = id;
  $("#orderId").textContent = id;
  const provider = o.delivery_provider === "ozon" ? "Озон" : o.delivery_provider === "yandex_market" ? "Яндекс Маркет" : "Не указан";
  $("#orderDetails").innerHTML = `<p><strong>${o.customer_name}</strong><br>${o.phone}<br>ПВЗ: ${provider}<br>Адрес: ${o.address}<br>${o.comment || ""}</p>${o.items.map((i) => `<div>${i.title} x ${i.quantity} — ${money(i.price * i.quantity)}</div>`).join("")}`;
  $("#orderForm").items_price.value = o.items_price || o.total_price || 0;
  $("#orderForm").delivery_price.value = o.delivery_price || 0;
  $("#orderForm").status.value = o.status;
  $("#orderForm").track_number.value = o.track_number || "";
  renderOrderTotal();
  openOverlay("orderModal");
};

function renderOrderTotal() {
  const form = $("#orderForm");
  $("#orderCalculatedTotal").textContent = money((Number(form.items_price.value) || 0) + (Number(form.delivery_price.value) || 0));
}

$("#newCategory").onclick = () => { $("#categoryForm").reset(); $("#categoryForm").id.value = ""; openOverlay("categoryModal"); };
$("#newSubcategory").onclick = async () => { if (!categories.length) await loadCategories(); $("#subcategoryForm").reset(); $("#subcategoryForm").id.value = ""; fillCategorySelect(); openOverlay("subcategoryModal"); };
$("#newProduct").onclick = async () => { if (!categories.length) await loadCategories(); if (!subcategories.length) subcategories = await api("/api/subcategories"); $("#productForm").reset(); $("#productForm").id.value = ""; $("#productForm").is_available.checked = true; fillCategorySelect(); openOverlay("productModal"); };
$("#logout").onclick = () => resetSession();

document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-page]");
  if (nav) loadPage(nav.dataset.page);
  const close = e.target.closest("[data-close]");
  if (close) closeOverlay(close.dataset.close);
});

document.addEventListener("change", async (e) => {
  if (e.target.matches("#productForm [name=category_id]")) fillSubcategorySelect();
  const input = e.target.closest("input[type=file][data-upload]");
  if (!input?.files?.[0]) return;
  const result = await upload(input.dataset.upload, input.files[0]);
  const form = input.closest("form");
  form.elements[input.dataset.target].value = result.url;
  if (input.dataset.originalTarget && form.elements[input.dataset.originalTarget]) form.elements[input.dataset.originalTarget].value = result.original_key || "";
  if (input.dataset.aliasTarget && form.elements[input.dataset.aliasTarget]) form.elements[input.dataset.aliasTarget].value = result.url;
});

$("#categoryForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const payload = { name: f.name.value, description: f.description.value, image: f.image.value, sort_order: Number(f.sort_order.value) || 0 };
  await api(f.id.value ? `/api/categories/${f.id.value}` : "/api/categories", { method: f.id.value ? "PUT" : "POST", body: JSON.stringify(payload) });
  closeOverlay("categoryModal"); loadCategories();
};

$("#subcategoryForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const payload = { category_id: f.category_id.value, name: f.name.value, description: f.description.value, image: f.image.value, sort_order: Number(f.sort_order.value) || 0 };
  await api(f.id.value ? `/api/subcategories/${f.id.value}` : "/api/subcategories", { method: f.id.value ? "PUT" : "POST", body: JSON.stringify(payload) });
  closeOverlay("subcategoryModal"); loadSubcategories();
};

$("#productForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const payload = {
    title: f.title.value, category_id: f.category_id.value || null, subcategory_id: f.subcategory_id.value || null, description: f.description.value, price: Number(f.price.value),
    old_price: f.old_price.value ? Number(f.old_price.value) : null, image: f.image.value, cover_image: f.cover_image.value, main_image: f.main_image.value,
    original_cover_image: f.original_cover_image.value, original_main_image: f.original_main_image.value, team: f.team.value, is_custom: f.is_custom.checked,
    custom_price: f.custom_price.value ? Number(f.custom_price.value) : null, product_size: f.product_size.value, lego_set: f.lego_set.value, project_name: f.project_name.value, custom_type: f.custom_type.value,
    includes_frame: f.includes_frame.checked, includes_mount: f.includes_mount.checked,
    show_in_hero: f.show_in_hero.checked, is_weekly_discount: f.is_weekly_discount.checked, is_available: f.is_available.checked, is_draft: f.is_draft.checked, sort_order: Number(f.sort_order.value) || 0,
  };
  await api(f.id.value ? `/api/products/${f.id.value}` : "/api/products", { method: f.id.value ? "PUT" : "POST", body: JSON.stringify(payload) });
  closeOverlay("productModal"); loadProducts();
};

$("#orderForm").onsubmit = async (e) => {
  e.preventDefault();
  await api(`/api/orders/${currentOrderId}`, { method: "PATCH", body: JSON.stringify({ status: e.currentTarget.status.value, track_number: e.currentTarget.track_number.value, items_price: Number(e.currentTarget.items_price.value) || 0, delivery_price: Number(e.currentTarget.delivery_price.value) || 0 }) });
  closeOverlay("orderModal"); loadOrders();
};

$("#orderForm").addEventListener("input", (e) => {
  if (e.target.name === "items_price" || e.target.name === "delivery_price") renderOrderTotal();
});

for (const form of [$("#settingsForm"), $("#bannersForm"), $("#contentForm"), $("#teamMediaForm")]) {
  if (!form) continue;
  form.onsubmit = async (e) => {
    e.preventDefault();
    await api("/api/settings", { method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget).entries())) });
    alert("Сохранено");
    loadSettings();
  };
}

$("#downloadBackup").onclick = async () => {
  try {
    await downloadBackup();
  } catch (error) {
    alert(error.message);
  }
};

$("#restoreBackup").onclick = async () => {
  const file = $("#restoreBackupFile").files?.[0];
  if (!file) return alert("Выберите JSON-файл резервной копии");
  if (!confirm("Восстановить резервную копию? Данные магазина будут обновлены содержимым файла.")) return;
  try {
    const result = await restoreBackup(file);
    const imported = result.imported || {};
    await loadSettings();
    await loadCategories();
    await loadSubcategories();
    await loadProducts();
    await loadDashboard();
    alert(`Восстановление завершено. Категории: ${imported.categories || 0}, товары: ${imported.products || 0}, настройки: ${imported.settings || 0}.`);
  } catch (error) {
    alert(error.message);
  }
};

const setupTelegramBotButton = $("#setupTelegramBot");
if (setupTelegramBotButton) {
  setupTelegramBotButton.onclick = async () => {
    try {
      const result = await api("/api/admin/setup-bot", { method: "POST", body: JSON.stringify({}) });
      alert(result.ok ? "Telegram webhook настроен" : "Backend ответил, но Telegram не подтвердил настройку");
    } catch (error) {
      alert(error.message);
    }
  };
}

checkSession();
