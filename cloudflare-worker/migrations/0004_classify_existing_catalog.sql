-- Complete the initial catalogue classification without changing administrator choices later.
UPDATE products
SET team = 'red-bull'
WHERE COALESCE(team, '') = '' AND lower(title) LIKE '%макса ферстаппена%';

UPDATE products
SET team = 'mclaren'
WHERE COALESCE(team, '') = '' AND lower(title) LIKE '%ayrton senna%';

UPDATE products
SET team = 'other'
WHERE COALESCE(team, '') = '';

UPDATE products
SET is_custom = 1,
    custom_price = CASE WHEN custom_price IS NULL THEN price ELSE custom_price END
WHERE category_id IN (
  SELECT id FROM categories WHERE lower(name) LIKE '%кастом%'
);
