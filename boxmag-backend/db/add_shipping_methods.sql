CREATE TABLE IF NOT EXISTS shipping_methods (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  method_key VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  eta_text VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shipping_methods_key (method_key)
);

INSERT INTO shipping_methods (method_key, name, eta_text, price, is_active, sort_order)
SELECT 'standard', 'Standard Delivery', 'Estimated 7-10 days', 25.00, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE method_key = 'standard');

INSERT INTO shipping_methods (method_key, name, eta_text, price, is_active, sort_order)
SELECT 'express', 'Express Delivery', 'Estimated 2-4 days', 40.00, 1, 2
WHERE NOT EXISTS (SELECT 1 FROM shipping_methods WHERE method_key = 'express');
