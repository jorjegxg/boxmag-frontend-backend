-- Remove the "DUMMY " prefix from product names. Item numbers stay unchanged.

UPDATE box_type_products
SET product_name = TRIM(SUBSTRING(product_name, 7))
WHERE product_name LIKE 'DUMMY %';
