ALTER TABLE products ADD COLUMN show_in_hero INTEGER DEFAULT 0;

UPDATE products
SET show_in_hero = 1
WHERE id IN (
  SELECT id
  FROM products
  WHERE is_available = 1 AND is_draft = 0
  ORDER BY is_weekly_discount DESC, sort_order, id DESC
  LIMIT 5
);
