CREATE TABLE IF NOT EXISTS box_type_products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  box_type_id INT UNSIGNED NOT NULL,
  item_no VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  internal_l_mm INT NOT NULL,
  internal_w_mm INT NOT NULL,
  internal_h_mm INT NOT NULL,
  internal_h2_mm INT NULL,
  quality_cardboard VARCHAR(100) NOT NULL,
  pallet_l_cm INT NOT NULL,
  pallet_w_cm INT NOT NULL,
  pallet_h_cm INT NOT NULL,
  weight_piece_gr DECIMAL(10,2) NOT NULL,
  weight_pallet_kg DECIMAL(10,2) NOT NULL,
  amount_qty_in_pcs INT NOT NULL,
  pallet_pcs INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_box_type_products_box_type
    FOREIGN KEY (box_type_id) REFERENCES box_types(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS box_type_product_prices (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  box_type_product_id INT UNSIGNED NOT NULL,
  price_name VARCHAR(100) NOT NULL,
  price_without_tax DECIMAL(10,2) NOT NULL,
  price_with_tax DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_box_type_product_prices_product
    FOREIGN KEY (box_type_product_id) REFERENCES box_type_products(id)
    ON DELETE CASCADE
);
