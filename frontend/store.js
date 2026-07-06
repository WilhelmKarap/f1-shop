(function () {
  const CATALOG_KEY = "f1-shop-catalog-v2";
  const ORDERS_KEY = "f1-shop-orders-v2";
  const SETTINGS_KEY = "f1-shop-settings-v2";

  const defaultCategories = [
    {
      id: "weekly",
      title: "Скидки недели",
      subtitle: "Главные предложения",
      image: svgData("Скидки недели", "#d91f2e", "#111820"),
      locked: true,
    },
    {
      id: "lego-posters",
      title: "Постеры для Lego",
      subtitle: "Senna, Schumacher, McLaren",
      image: svgData("Lego Posters", "#1b3764", "#e23636"),
    },
    {
      id: "f1-posters",
      title: "Постеры Формулы 1",
      subtitle: "Команды, пилоты, календари",
      image: svgData("Formula 1 Posters", "#111820", "#d91f2e"),
    },
    {
      id: "clothes",
      title: "Тематическая одежда",
      subtitle: "Футболки и дропы",
      image: svgData("Racing Wear", "#ff7134", "#111820"),
    },
    {
      id: "illustrations",
      title: "Готовые иллюстрации",
      subtitle: "Арт с конструкторами",
      image: svgData("Illustrations", "#225fd6", "#13a366"),
    },
    {
      id: "custom",
      title: "Кастомные постеры",
      subtitle: "Под болид, пилота или сет",
      image: svgData("Custom Posters", "#7c3aed", "#10141b"),
    },
    {
      id: "other",
      title: "Другое",
      subtitle: "Конструкторы и наклейки",
      image: svgData("Other Racing Goods", "#0f766e", "#f4bd32"),
    },
  ];

  const defaultProducts = [
    product("lego-senna-schumacher-mansell", "lego-posters", "Постер Формулы 1 Lego Senna, Schumacher, Mansell", 2800, 3500, true, "Lego Legends"),
    product("rb22-2026", "f1-posters", "Постер F1 Red Bull Racing RB22 2026", 1120, 1400, true, "Red Bull RB22"),
    product("mercedes-w17", "f1-posters", "Постер F1 Mercedes AMG W17 2026", 1120, 1400, false, "Mercedes W17"),
    product("ferrari-sf26", "f1-posters", "Постер F1 Ferrari SF-26 2026", 1120, 1400, true, "Ferrari SF-26"),
    product("mclaren-mcl40", "f1-posters", "Постер F1 McLaren MCL40 2026", 1120, 1400, false, "McLaren MCL40"),
    product("calendar-2026", "f1-posters", "Календарь гонок Формулы 1 сезона 2026", 1200, 0, false, "Race Calendar"),
    product("lego-f1-senna-schumacher", "lego-posters", "Постер с конструктором F1 Senna Schumacher Mansell", 9500, 0, false, "Constructor Art"),
    product("williams-sainz-albon", "f1-posters", "Постер Формулы 1 Williams Sainz Albon", 1120, 1400, false, "Williams"),
    product("lego-speed-champions-tech", "lego-posters", "Постер команды Формулы 1 для Lego Speed Champions / Technic", 2700, 0, false, "Speed Champions"),
    product("ayrton-senna-nigel-mansell", "f1-posters", "Постер Формулы 1 Lego Ayrton Senna и Nigel Mansell", 2000, 0, false, "Senna Mansell"),
    product("mclaren-2028", "lego-posters", "Постер для Lego Technic F1 McLaren MCL39 2028", 2700, 0, false, "McLaren Technic"),
    product("aston-martin-stroll", "f1-posters", "Постер Формулы 1 Aston Martin Alonso Stroll AMR26", 1120, 1400, false, "Aston Martin"),
    product("mclaren-norris-piastri", "f1-posters", "Постер McLaren Formula 1 Norris Piastri MCL40", 1120, 1400, false, "Norris Piastri"),
    product("red-bull-cy23", "other", "Кастомный конструктор Red Bull Cy23 2025 RB21", 12450, 0, true, "Custom Constructor"),
    product("red-bull-verstappen-shirt", "clothes", "Футболка как у Макса Ферстаппена", 1249, 0, true, "Team Wear"),
    product("mercedes-antonelli", "f1-posters", "Постер Mercedes-AMG Formula 1 Russell Antonelli", 1120, 1400, false, "Russell Antonelli"),
    product("ferrari-leclerc-hamilton", "f1-posters", "Постер Ferrari Formula 1 Leclerc Hamilton", 1120, 1400, true, "Leclerc Hamilton"),
    product("custom-poster", "custom", "Кастомный постер под ваш болид, пилота или Lego-набор", 2500, 0, false, "Custom Poster"),
    product("stickers", "other", "Набор наклеек F1 для ноутбука, тубуса или конструктора", 540, 0, false, "Sticker Pack"),
  ];

  const defaultSettings = {
    paymentQr: svgData("QR Payment", "#111820", "#25b468"),
    paymentNote: "Укажите номер заказа в комментарии к переводу, если банк позволяет это сделать.",
  };

  function product(id, categoryId, title, price, oldPrice, weeklyDeal, label) {
    return {
      id,
      categoryId,
      title,
      price,
      oldPrice,
      weeklyDeal,
      image: svgData(label, colorFromText(id), "#111820"),
      options: ["A4", "A3 +350 ₽", "A2 +800 ₽"],
      description: "Товар из коллекции F1 Constructor Shop. Картинку, категорию, цену и описание можно поменять в редакторе.",
      bullets: ["Печать на плотной бумаге", "Упаковка для доставки", "Можно оформить как подарок", "Доставка после подтверждения оплаты"],
    };
  }

  function colorFromText(text) {
    const palette = ["#d91f2e", "#ff7134", "#225fd6", "#13a366", "#7c3aed", "#0f766e"];
    const index = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
    return palette[index];
  }

  function svgData(label, colorA, colorB) {
    const safe = String(label).replace(/[<>&"]/g, "");
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="${colorA}"/>
            <stop offset="1" stop-color="${colorB}"/>
          </linearGradient>
          <pattern id="p" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="rgba(255,255,255,.16)"/>
            <rect x="40" y="40" width="40" height="40" fill="rgba(255,255,255,.16)"/>
          </pattern>
        </defs>
        <rect width="900" height="600" fill="url(#g)"/>
        <rect width="900" height="600" fill="url(#p)" opacity=".24"/>
        <path d="M70 420 C220 340 300 510 470 420 S720 310 835 405" fill="none" stroke="white" stroke-width="24" opacity=".42"/>
        <text x="70" y="120" fill="white" font-family="Arial, sans-serif" font-size="58" font-weight="800">${safe}</text>
        <text x="70" y="190" fill="white" font-family="Arial, sans-serif" font-size="28" font-weight="700" opacity=".8">F1 Constructor Shop</text>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getCatalog() {
    return read(CATALOG_KEY, { categories: defaultCategories, products: defaultProducts });
  }

  function saveCatalog(catalog) {
    const weekly = defaultCategories[0];
    const categories = [weekly, ...catalog.categories.filter((category) => category.id !== "weekly")];
    write(CATALOG_KEY, { categories, products: catalog.products });
  }

  function getOrders() {
    return read(ORDERS_KEY, []);
  }

  function saveOrders(orders) {
    write(ORDERS_KEY, orders);
  }

  function addOrder(order) {
    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);
  }

  function getSettings() {
    return read(SETTINGS_KEY, defaultSettings);
  }

  function saveSettings(settings) {
    write(SETTINGS_KEY, settings);
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  window.F1ShopStore = {
    getCatalog,
    saveCatalog,
    getOrders,
    saveOrders,
    addOrder,
    getSettings,
    saveSettings,
    uid,
    fileToDataUrl,
    svgData,
  };
})();
