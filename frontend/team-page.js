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

function settingNumber(key, fallback) {
  const raw = settings[key];
  if (raw == null || String(raw).trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function initTeamLayerAlignment() {
  const stage = $("#teamHero");
  const background = $("#teamBackground");
  const foreground = $("#teamForeground");
  if (!stage || !background || !foreground) return;

  let frame = 0;
  const update = () => {
    frame = 0;
    if (!background.naturalWidth || !background.naturalHeight || !foreground.naturalWidth || !foreground.naturalHeight) return;

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    const backgroundRatio = background.naturalWidth / background.naturalHeight;
    const foregroundRatio = foreground.naturalWidth / foreground.naturalHeight;
    const planeWidth = Math.max(stageWidth, stageHeight * backgroundRatio);
    const planeHeight = planeWidth / backgroundRatio;
    const planeLeft = (stageWidth - planeWidth) / 2;
    const ratiosDiffer = Math.abs(backgroundRatio - foregroundRatio) > .03;
    const fallback = team.mediaAlignment || { scale: 100, x: 0, y: 0 };
    const scale = ratiosDiffer ? Math.min(200, Math.max(20, settingNumber(`team_${slug}_foreground_scale`, fallback.scale))) : 100;
    const offsetX = ratiosDiffer ? Math.min(100, Math.max(-100, settingNumber(`team_${slug}_foreground_x`, fallback.x))) : 0;
    const offsetY = ratiosDiffer ? Math.min(100, Math.max(-100, settingNumber(`team_${slug}_foreground_y`, fallback.y))) : 0;
    const foregroundWidth = planeWidth * scale / 100;
    const foregroundHeight = foregroundWidth / foregroundRatio;
    const foregroundLeft = planeLeft + planeWidth * offsetX / 100;
    const foregroundTop = planeHeight * offsetY / 100;
    const originX = (planeLeft + planeWidth / 2 - foregroundLeft) / foregroundWidth * 100;
    const originY = -foregroundTop / foregroundHeight * 100;

    Object.assign(background.style, {
      left: `${planeLeft}px`, top: "0px", width: `${planeWidth}px`, height: `${planeHeight}px`, right: "auto", bottom: "auto",
    });
    Object.assign(foreground.style, {
      left: `${foregroundLeft}px`, top: `${foregroundTop}px`, width: `${foregroundWidth}px`, height: `${foregroundHeight}px`, right: "auto", bottom: "auto",
      transformOrigin: `${originX}% ${originY}%`,
    });
    stage.classList.add("team-story__stage--aligned");
    stage.classList.toggle("team-story__stage--corrected", ratiosDiffer);
  };
  const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };

  [background, foreground].forEach((image) => {
    if (image.complete && image.naturalWidth) requestUpdate();
    else image.addEventListener("load", requestUpdate, { once: true });
  });
  addEventListener("resize", requestUpdate, { passive: true });
}

function teamText(field) {
  return cleanCopy(settings[`team_${slug}_${field}`] || team.details?.[field] || "");
}

function renderTeam() {
  const colors = team.colors;
  Object.entries(colors).forEach(([key, value]) => document.documentElement.style.setProperty(`--${key}`, value));
  $("#teamName").textContent = team.name;
  $("#teamDrivers").innerHTML = team.drivers.map((driver) => `<span>${escapeHtml(driver)}</span>`).join("");
  $("#teamFounded").textContent = teamText("founded");
  $("#teamHistory").textContent = teamText("history");
  $("#teamAchievements").textContent = teamText("achievements");
  $("#teamLegends").textContent = teamText("legends");

  const background = settings[`team_${slug}_background`];
  const foreground = settings[`team_${slug}_foreground`] || background;
  setImage("teamLogo", settings[`team_${slug}_logo`], team.name);
  setImage("teamBackground", background || foreground);
  setImage("teamForeground", foreground || background);
  $("#managerLink").href = managerUrl();
  document.title = `${team.name} | F1 Posters`;
}

function productMedia(product, title) {
  const cover = asset(product.cover_image || product.image) || FALLBACK;
  const main = asset(product.main_image || product.cover_image || product.image) || FALLBACK;
  return `<img class="page-product-card__cover" src="${escapeHtml(cover)}" onerror="this.src='${FALLBACK}'" alt="${escapeHtml(title)}" loading="lazy" decoding="async" />
    <img class="page-product-card__main" src="${escapeHtml(main)}" onerror="this.src='${FALLBACK}'" alt="" loading="lazy" decoding="async" />`;
}

function initProductOrientations() {
  document.querySelectorAll(".page-product-card__cover").forEach((image) => {
    const apply = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      image.closest(".page-product-card")?.classList.toggle("is-landscape", image.naturalWidth / image.naturalHeight > 1.12);
    };
    if (image.complete) apply();
    else image.addEventListener("load", apply, { once: true });
  });
}

function initProductMediaTransitions() {
  const root = $("#teamProducts");
  const previousProbe = Number(root.dataset.mediaProbeTimer || 0);
  if (previousProbe) {
    clearInterval(previousProbe);
    delete root.dataset.mediaProbeTimer;
  }
  const pending = [];
  root.querySelectorAll(".page-product-card__main:not([data-transition-bound])").forEach((image) => {
    image.dataset.transitionBound = "true";
    const markReady = () => {
      if (image.classList.contains("is-loaded")) return;
      requestAnimationFrame(() => image.classList.add("is-loaded"));
    };
    if (image.naturalWidth) markReady();
    else {
      pending.push({ image, markReady });
      image.addEventListener("load", markReady, { once: true });
    }
  });
  if (!pending.length) return;
  let checks = 0;
  const probe = setInterval(() => {
    pending.forEach(({ image, markReady }) => {
      if (image.naturalWidth) markReady();
    });
    checks += 1;
    if (checks >= 80 || pending.every(({ image }) => image.classList.contains("is-loaded"))) {
      clearInterval(probe);
      if (root.dataset.mediaProbeTimer === String(probe)) delete root.dataset.mediaProbeTimer;
    }
  }, 125);
  root.dataset.mediaProbeTimer = String(probe);
}

function renderProducts() {
  $("#teamProductCount").textContent = `${products.length} товаров`;
  $("#teamProducts").innerHTML = products.map((product) => {
    const title = cleanCopy(product.title);
    const custom = Boolean(product.is_custom);
    const customPrice = product.custom_price ? `От ${money(product.custom_price)}` : "Цена по запросу";
    return `<article class="page-product-card">
      <a class="page-product-card__media" href="product.html?id=${product.id}">${productMedia(product, title)}</a>
      <div class="page-product-card__body"><small>${escapeHtml(team.name)}</small><h3>${escapeHtml(title)}</h3>
        ${custom ? `<div class="page-custom-price" data-price-control><button type="button" data-reveal-price>Узнать цену</button><strong class="hidden">${escapeHtml(customPrice)}</strong><a class="hidden" href="${escapeHtml(managerUrl())}" target="_blank" rel="noreferrer">Обсудить с менеджером</a></div>` : `<strong>${money(product.price)}</strong><button type="button" data-add="${product.id}" aria-label="Добавить в корзину">+</button>`}
      </div>
    </article>`;
  }).join("") || `<p class="page-message">Для этой команды товары пока не добавлены.</p>`;
  initProductOrientations();
  initProductMediaTransitions();
}

function initTeamStory() {
  const story = $("#teamStory");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frame = 0;
  const update = () => {
    frame = 0;
    const rect = story.getBoundingClientRect();
    const travel = Math.max(1, story.offsetHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / travel));
    document.documentElement.style.setProperty("--team-progress", String(reduced ? (progress > .2 ? 1 : 0) : progress));
    document.body.classList.toggle("story-copy-visible", progress > .23);
    $("#teamMeterValue").textContent = String(Math.round(progress * 100)).padStart(3, "0");
  };
  const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
  update();
  addEventListener("scroll", requestUpdate, { passive: true });
  addEventListener("resize", requestUpdate, { passive: true });
}

$("#teamProducts").addEventListener("click", (event) => {
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
  getJson(`/api/products?team=${encodeURIComponent(slug)}`),
]).then(([settingsData, productData]) => {
  settings = settingsData;
  products = productData;
  renderTeam();
  renderProducts();
  updateCartCount();
  initTeamLayerAlignment();
  initTeamStory();
}).catch((error) => {
  $("#teamProducts").innerHTML = `<p class="page-message">${escapeHtml(error.message)}</p>`;
});
