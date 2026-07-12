const API = window.F1_CONFIG.API_URL;
let token = localStorage.getItem("admin_token") || "";
let categories = [];
let products = [];
let orders = [];
let settings = {};
let currentOrderId = null;

const $ = (s) => document.querySelector(s);
const money = (v) => `${new Intl.NumberFormat("ru-RU").format(v || 0)} ₽`;
const asset = (url) => url ? (url.startsWith("http") ? url : `${API}${url}`) : "";
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` });

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
  if (page === "products") await loadProducts();
  if (page === "orders") await loadOrders();
  if (page === "weekly") await loadWeekly();
  if (page === "banners" || page === "settings") await loadSettings();
}

async function loadDashboard() {
  const s = await api("/api/stats");
  $("#statOrdersToday").textContent = s.ordersToday;
  $("#statRevenue").textContent = money(s.revenue);
  $("#statOrders").textContent = s.totalOrders;
  $("#statProducts").textContent = s.totalProducts;
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
}

async function loadProducts() {
  if (!categories.length) await loadCategories();
  products = await api("/api/products?admin=1");
  $("#productsTable").innerHTML = products.map((p) => {
    const category = categories.find((c) => c.id === p.category_id);
    return `<tr><td><img class="thumb" src="${asset(p.image)}" /></td><td>${p.title}<small>${p.is_draft ? "Черновик" : ""}</small></td><td>${category?.name || ""}</td><td>${money(p.price)}</td><td>${p.is_available ? "В наличии" : "Нет в наличии"}</td><td><button onclick="editProduct(${p.id})">Изменить</button><button onclick="deleteProduct(${p.id})">Удалить</button></td></tr>`;
  }).join("");
}

async function loadWeekly() {
  if (!products.length) products = await api("/api/products?admin=1");
  $("#weeklyTable").innerHTML = products.filter((p) => p.is_weekly_discount).map((p) => `
    <tr><td><img class="thumb" src="${asset(p.image)}" /></td><td>${p.title}</td><td>${money(p.price)}</td><td><button onclick="editProduct(${p.id})">Изменить</button></td></tr>
  `).join("") || `<tr><td colspan="4">Скидок недели пока нет</td></tr>`;
}

async function loadOrders() {
  orders = await api("/api/orders");
  $("#ordersTable").innerHTML = orders.map((o) => `
    <tr><td>#${o.id}</td><td>${o.customer_name}<small>${o.username ? "@" + o.username : o.telegram_id}</small></td><td>${o.phone}</td><td>${money(o.total_price)}</td><td><span class="status">${labelStatus(o.status)}</span></td><td>${new Date(o.created_at).toLocaleString("ru-RU")}</td><td><button onclick="openOrder(${o.id})">Открыть</button></td></tr>
  `).join("");
}

function labelStatus(s) {
  return { new: "Новый", awaiting_payment: "Ожидает оплаты", awaiting_confirmation: "Ожидает подтверждения", paid: "Оплачен", shipped: "Отправлен", completed: "Завершен", cancelled: "Отменен" }[s] || s;
}

async function loadSettings() {
  settings = await api("/api/settings");
  for (const form of [$("#settingsForm"), $("#bannersForm")]) {
    [...form.elements].forEach((el) => {
      if (el.name && settings[el.name] != null) el.value = settings[el.name];
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

window.editProduct = async (id) => {
  if (!categories.length) await loadCategories();
  const p = products.find((x) => x.id === id) || await api(`/api/products/${id}`);
  const f = $("#productForm");
  f.id.value = p.id; f.title.value = p.title; f.category_id.value = p.category_id || ""; f.description.value = p.description || "";
  f.price.value = p.price; f.old_price.value = p.old_price || ""; f.image.value = p.image || "";
  f.is_weekly_discount.checked = !!p.is_weekly_discount; f.is_available.checked = !!p.is_available; f.is_draft.checked = !!p.is_draft; f.sort_order.value = p.sort_order || 0;
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
  $("#orderDetails").innerHTML = `<p>${o.customer_name}<br>${o.phone}<br>${o.address}<br>${o.comment || ""}</p>${o.items.map((i) => `<div>${i.title} x ${i.quantity} — ${money(i.price * i.quantity)}</div>`).join("")}`;
  $("#orderForm").status.value = o.status;
  $("#orderForm").track_number.value = o.track_number || "";
  openOverlay("orderModal");
};

$("#newCategory").onclick = () => { $("#categoryForm").reset(); $("#categoryForm").id.value = ""; openOverlay("categoryModal"); };
$("#newProduct").onclick = async () => { if (!categories.length) await loadCategories(); $("#productForm").reset(); $("#productForm").id.value = ""; $("#productForm").is_available.checked = true; openOverlay("productModal"); };
$("#logout").onclick = () => resetSession();

document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-page]");
  if (nav) loadPage(nav.dataset.page);
  const close = e.target.closest("[data-close]");
  if (close) closeOverlay(close.dataset.close);
});

document.addEventListener("change", async (e) => {
  const input = e.target.closest("input[type=file][data-upload]");
  if (!input?.files?.[0]) return;
  const { url } = await upload(input.dataset.upload, input.files[0]);
  input.closest("form").elements[input.dataset.target].value = url;
});

$("#categoryForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const payload = { name: f.name.value, description: f.description.value, image: f.image.value, sort_order: Number(f.sort_order.value) || 0 };
  await api(f.id.value ? `/api/categories/${f.id.value}` : "/api/categories", { method: f.id.value ? "PUT" : "POST", body: JSON.stringify(payload) });
  closeOverlay("categoryModal"); loadCategories();
};

$("#productForm").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const payload = {
    title: f.title.value, category_id: f.category_id.value || null, description: f.description.value, price: Number(f.price.value),
    old_price: f.old_price.value ? Number(f.old_price.value) : null, image: f.image.value,
    is_weekly_discount: f.is_weekly_discount.checked, is_available: f.is_available.checked, is_draft: f.is_draft.checked, sort_order: Number(f.sort_order.value) || 0,
  };
  await api(f.id.value ? `/api/products/${f.id.value}` : "/api/products", { method: f.id.value ? "PUT" : "POST", body: JSON.stringify(payload) });
  closeOverlay("productModal"); loadProducts();
};

$("#orderForm").onsubmit = async (e) => {
  e.preventDefault();
  await api(`/api/orders/${currentOrderId}`, { method: "PATCH", body: JSON.stringify({ status: e.currentTarget.status.value, track_number: e.currentTarget.track_number.value }) });
  closeOverlay("orderModal"); loadOrders();
};

for (const form of [$("#settingsForm"), $("#bannersForm")]) {
  form.onsubmit = async (e) => {
    e.preventDefault();
    await api("/api/settings", { method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget).entries())) });
    alert("Сохранено");
    loadSettings();
  };
}

checkSession();
