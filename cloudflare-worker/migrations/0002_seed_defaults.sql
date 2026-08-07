INSERT OR IGNORE INTO settings (key, value) VALUES
  ('shop_name', 'F1 Posters'),
  ('manager_username', 'F1posters_mng'),
  ('manager_url', 'https://t.me/F1posters_mng'),
  ('banner_text', 'Posters, LEGO Formula 1, clothes and custom illustrations'),
  ('banner_image', ''),
  ('logo_image', ''),
  ('qr_image', ''),
  ('payment_link', ''),
  ('delivery_text', 'Delivery across Russia.'),
  ('payment_text', 'Payment by QR transfer. The moderator confirms the order after payment.'),
  ('welcome_text', 'Добро пожаловать в F1 Posters.\n\nНажмите кнопку МАГАЗИН, чтобы открыть каталог и оформить заказ.\n\nОплата по QR-коду или ссылке после расчета доставки администратором.');

INSERT OR IGNORE INTO categories (id, name, description, sort_order) VALUES
  (1, 'Постеры Formula 1', 'Команды, пилоты и болиды', 10),
  (2, 'Постеры LEGO Formula 1', 'Постеры для конструкторов', 20),
  (3, 'Тематическая одежда', 'Футболки и дропы', 30),
  (4, 'Готовые иллюстрации', 'Арт с конструкторами', 40),
  (5, 'Кастомные постеры', 'Индивидуальные макеты', 50),
  (6, 'Другое', 'Конструкторы и наклейки', 60);
