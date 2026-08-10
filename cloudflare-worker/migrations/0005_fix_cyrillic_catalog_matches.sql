-- SQLite lower() only folds ASCII, so match both Cyrillic variants explicitly.
UPDATE products
SET team = 'red-bull'
WHERE title LIKE '%Макса Ферстаппена%' OR title LIKE '%макса ферстаппена%';

UPDATE products
SET is_custom = 1,
    custom_price = CASE WHEN custom_price IS NULL THEN price ELSE custom_price END
WHERE category_id IN (
  SELECT id FROM categories
  WHERE name LIKE '%Кастом%' OR name LIKE '%кастом%'
);
