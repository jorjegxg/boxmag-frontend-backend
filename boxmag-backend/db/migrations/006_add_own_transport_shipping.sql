INSERT INTO shipping_methods (method_key, name, eta_text, price, is_active, sort_order)
SELECT 'own-transport', 'Own transport', 'Customer pickup / own carrier', 0.00, 1, 0
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE method_key = 'own-transport');
