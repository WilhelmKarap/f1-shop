-- Adds presentation and custom-order fields without touching the existing catalogue.
ALTER TABLE products ADD COLUMN team TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN cover_image TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN main_image TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN original_cover_image TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN original_main_image TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN is_custom INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN custom_price REAL;
ALTER TABLE products ADD COLUMN product_size TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN lego_set TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN project_name TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN custom_type TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN includes_frame INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN includes_mount INTEGER DEFAULT 0;

-- Existing shops used one image column. Keep every old product visible in the new UI.
UPDATE products SET cover_image = image WHERE COALESCE(cover_image, '') = '';
UPDATE products SET main_image = image WHERE COALESCE(main_image, '') = '';

-- Give the existing catalogue useful team pages immediately. Admin can edit any match later.
UPDATE products SET team = 'mclaren' WHERE lower(title || ' ' || description) LIKE '%mclaren%';
UPDATE products SET team = 'mercedes' WHERE lower(title || ' ' || description) LIKE '%mercedes%';
UPDATE products SET team = 'ferrari' WHERE lower(title || ' ' || description) LIKE '%ferrari%';
UPDATE products SET team = 'racing-bulls' WHERE lower(title || ' ' || description) LIKE '%racing bulls%';
UPDATE products SET team = 'red-bull' WHERE lower(title || ' ' || description) LIKE '%red bull%' AND team = '';
UPDATE products SET team = 'alpine' WHERE lower(title || ' ' || description) LIKE '%alpine%';
UPDATE products SET team = 'haas' WHERE lower(title || ' ' || description) LIKE '%haas%';
UPDATE products SET team = 'audi' WHERE lower(title || ' ' || description) LIKE '%audi%' OR lower(title || ' ' || description) LIKE '%sauber%';
UPDATE products SET team = 'williams' WHERE lower(title || ' ' || description) LIKE '%williams%';
UPDATE products SET team = 'aston-martin' WHERE lower(title || ' ' || description) LIKE '%aston martin%';
UPDATE products SET team = 'other' WHERE lower(title || ' ' || description) LIKE '%cadillac%' OR lower(title || ' ' || description) LIKE '%apx gp%';
