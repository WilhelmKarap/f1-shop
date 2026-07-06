const store = window.F1ShopStore;
const moneyFormat = new Intl.NumberFormat("ru-RU");

let catalog = store.getCatalog();
let settings = store.getSettings();

const categoryForm = document.querySelector("#categoryForm");
const productForm = document.querySelector("#productForm");
const settingsForm = document.querySelector("#settingsForm");
const categoryList = document.querySelector("#categoryList");
const productListAdmin = document.querySelector("#productListAdmin");
const ordersTable = document.querySelector("#ordersTable");
const categorySelect = productForm.elements.categoryId;

function money(value) {
  return `${moneyFormat.format(value || 0)} ₽`;
}

function splitList(value, separator = "\n") {
  const parts = separator === "," ? value.split(",") : value.split(/\n/);
  return parts.map((item) => item.trim()).filter(Boolean);
}

function saveCatalogAndRender() {
  store.saveCatalog(catalog);
  catalog = store.getCatalog();
  renderAll();
}

function fillCategorySelect() {
  categorySelect.innerHTML = catalog.categories
    .filter((category) => category.id !== "weekly")
    .map((category) => `<option value="${category.id}">${category.title}</option>`)
    .join("");
}

function renderCategories() {
  categoryList.innerHTML = catalog.categories
    .filter((category) => category.id !== "weekly")
    .map((category) => `
      <article class="admin-list-item">
        <img src="${category.image}" alt="${category.title}" />
        <div>
          <strong>${category.title}</strong>
          <small>${category.subtitle || ""}</small>
        </div>
        <button type="button" data-edit-category="${category.id}">Редактировать</button>
        <button type="button" data-delete-category="${category.id}">Удалить</button>
      </article>
    `).join("");
}

function renderProducts() {
  productListAdmin.innerHTML = catalog.products.map((product) => `
    <article class="admin-list-item">
      <img src="${product.image}" alt="${product.title}" />
      <div>
        <strong>${product.title}</strong>
        <small>${categoryTitle(product.categoryId)} · ${money(product.price)}${product.weeklyDeal ? " · скидки недели" : ""}</small>
      </div>
      <button type="button" data-edit-product="${product.id}">Редактировать</button>
      <button type="button" data-delete-product="${product.id}">Удалить</button>
    </article>
  `).join("");
}

function categoryTitle(id) {
  return catalog.categories.find((category) => category.id === id)?.title || "Без категории";
}

function renderSettings() {
  settingsForm.elements.paymentQr.value = settings.paymentQr?.startsWith("data:") ? "" : settings.paymentQr || "";
  settingsForm.elements.paymentNote.value = settings.paymentNote || "";
}

function renderOrders() {
  const orders = store.getOrders();
  ordersTable.innerHTML = orders.map((order) => `
    <tr>
      <td>${order.id}</td>
      <td>${order.createdAt}</td>
      <td>${order.customer.name || ""}</td>
      <td>${order.customer.phone || ""}</td>
      <td>${order.customer.telegram || ""}</td>
      <td>${order.items.map((item) => `${item.title} (${item.qty} шт.)`).join("<br>")}</td>
      <td>${money(order.total)}</td>
      <td>
        <select data-order-status="${order.id}">
          ${["Ожидает подтверждения оплаты", "Оплата подтверждена", "Передан в работу", "Отправлен", "Отменен"].map((status) => `
            <option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>
          `).join("")}
        </select>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="8">Заказов пока нет</td></tr>`;
}

function renderAll() {
  fillCategorySelect();
  renderCategories();
  renderProducts();
  renderSettings();
  renderOrders();
}

function resetCategoryForm() {
  categoryForm.reset();
  categoryForm.elements.id.value = "";
}

function resetProductForm() {
  productForm.reset();
  productForm.elements.id.value = "";
}

async function imageFromForm(form, fileName, urlName, fallback) {
  const file = form.elements[fileName].files[0];
  const uploaded = await store.fileToDataUrl(file);
  return uploaded || form.elements[urlName].value.trim() || fallback;
}

categoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(categoryForm);
  const id = data.get("id") || store.uid("category");
  const existing = catalog.categories.find((category) => category.id === id);
  const category = {
    id,
    title: data.get("title").trim(),
    subtitle: data.get("subtitle").trim(),
    image: await imageFromForm(categoryForm, "imageFile", "image", existing?.image || store.svgData(data.get("title"), "#111820", "#d91f2e")),
  };

  catalog.categories = existing
    ? catalog.categories.map((item) => (item.id === id ? category : item))
    : [...catalog.categories, category];
  saveCatalogAndRender();
  resetCategoryForm();
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(productForm);
  const id = data.get("id") || store.uid("product");
  const existing = catalog.products.find((product) => product.id === id);
  const product = {
    id,
    title: data.get("title").trim(),
    categoryId: data.get("categoryId"),
    price: Number(data.get("price") || 0),
    oldPrice: Number(data.get("oldPrice") || 0),
    weeklyDeal: data.get("weeklyDeal") === "on",
    image: await imageFromForm(productForm, "imageFile", "image", existing?.image || store.svgData(data.get("title"), "#111820", "#d91f2e")),
    options: splitList(data.get("options") || "Без варианта", ","),
    description: data.get("description").trim(),
    bullets: splitList(data.get("bullets") || ""),
  };

  catalog.products = existing
    ? catalog.products.map((item) => (item.id === id ? product : item))
    : [...catalog.products, product];
  saveCatalogAndRender();
  resetProductForm();
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  settings = {
    paymentQr: await imageFromForm(settingsForm, "paymentQrFile", "paymentQr", settings.paymentQr),
    paymentNote: settingsForm.elements.paymentNote.value.trim(),
  };
  store.saveSettings(settings);
  renderSettings();
});

document.querySelector("#newCategoryButton").addEventListener("click", resetCategoryForm);
document.querySelector("#newProductButton").addEventListener("click", resetProductForm);

document.addEventListener("click", (event) => {
  const editCategory = event.target.closest("[data-edit-category]");
  const deleteCategory = event.target.closest("[data-delete-category]");
  const editProduct = event.target.closest("[data-edit-product]");
  const deleteProduct = event.target.closest("[data-delete-product]");

  if (editCategory) {
    const category = catalog.categories.find((item) => item.id === editCategory.dataset.editCategory);
    categoryForm.elements.id.value = category.id;
    categoryForm.elements.title.value = category.title;
    categoryForm.elements.subtitle.value = category.subtitle || "";
    categoryForm.elements.image.value = category.image?.startsWith("data:") ? "" : category.image || "";
  }

  if (deleteCategory) {
    const id = deleteCategory.dataset.deleteCategory;
    catalog.categories = catalog.categories.filter((category) => category.id !== id);
    catalog.products = catalog.products.map((product) => product.categoryId === id ? { ...product, categoryId: "other" } : product);
    saveCatalogAndRender();
  }

  if (editProduct) {
    const product = catalog.products.find((item) => item.id === editProduct.dataset.editProduct);
    productForm.elements.id.value = product.id;
    productForm.elements.title.value = product.title;
    productForm.elements.categoryId.value = product.categoryId;
    productForm.elements.price.value = product.price;
    productForm.elements.oldPrice.value = product.oldPrice || "";
    productForm.elements.weeklyDeal.checked = Boolean(product.weeklyDeal);
    productForm.elements.image.value = product.image?.startsWith("data:") ? "" : product.image || "";
    productForm.elements.options.value = (product.options || []).join(", ");
    productForm.elements.description.value = product.description || "";
    productForm.elements.bullets.value = (product.bullets || []).join("\n");
  }

  if (deleteProduct) {
    catalog.products = catalog.products.filter((product) => product.id !== deleteProduct.dataset.deleteProduct);
    saveCatalogAndRender();
  }
});

ordersTable.addEventListener("change", (event) => {
  const statusSelect = event.target.closest("[data-order-status]");
  if (!statusSelect) return;
  const orders = store.getOrders().map((order) => (
    order.id === statusSelect.dataset.orderStatus ? { ...order, status: statusSelect.value } : order
  ));
  store.saveOrders(orders);
  renderOrders();
});

document.querySelector("#exportOrdersButton").addEventListener("click", () => {
  const rows = store.getOrders().map((order) => ({
    id: order.id,
    createdAt: order.createdAt,
    status: order.status,
    name: order.customer.name,
    phone: order.customer.phone,
    email: order.customer.email,
    address: order.customer.address,
    telegram: order.customer.telegram,
    items: order.items.map((item) => `${item.title} / ${item.option} / ${item.qty} шт.`).join("; "),
    total: order.total,
  }));
  const header = Object.keys(rows[0] || { id: "", createdAt: "", status: "", name: "", phone: "", email: "", address: "", telegram: "", items: "", total: "" });
  const csv = [
    header.join(";"),
    ...rows.map((row) => header.map((key) => `"${String(row[key] || "").replace(/"/g, '""')}"`).join(";")),
  ].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "f1-shop-orders.csv";
  link.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#clearOrdersButton").addEventListener("click", () => {
  store.saveOrders([]);
  renderOrders();
});

renderAll();
