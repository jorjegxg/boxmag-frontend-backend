-- Minimum e-commerce order: 100 pcs per product line.
-- Removes legacy sub-100 / 100 price tiers (100–299 pcs uses tier "300").

DELETE FROM box_type_product_prices
WHERE LOWER(REPLACE(price_name, ' ', '')) IN ('100', '<100', 'under100');

UPDATE box_type_products
SET amount_qty_in_pcs = 100
WHERE amount_qty_in_pcs < 100;
