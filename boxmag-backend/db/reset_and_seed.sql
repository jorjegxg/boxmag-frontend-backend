SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS box_type_product_prices;
DROP TABLE IF EXISTS box_type_images;
DROP TABLE IF EXISTS box_type_products;
DROP TABLE IF EXISTS newsletter_subscribers;
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS pending_user_registrations;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS shipping_methods;
DROP TABLE IF EXISTS box_types;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS box_types (
  id INT UNSIGNED NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS box_type_images (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  box_type_id INT UNSIGNED NOT NULL,
  url VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  alt_text VARCHAR(255) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_box_type_images_box_type
    FOREIGN KEY (box_type_id) REFERENCES box_types(id)
    ON DELETE CASCADE,
  INDEX idx_box_type_images_box_type_sort (box_type_id, sort_order)
);

CREATE TABLE IF NOT EXISTS box_type_products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  box_type_id INT UNSIGNED NOT NULL,
  item_no VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  internal_l_mm INT NOT NULL,
  internal_w_mm INT NOT NULL,
  internal_h_mm INT NOT NULL,
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
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_box_type_product_prices_product
    FOREIGN KEY (box_type_product_id) REFERENCES box_type_products(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(120) NULL,
  last_name VARCHAR(120) NULL,
  company_name VARCHAR(255) NULL,
  vat_number VARCHAR(120) NULL,
  phone VARCHAR(80) NULL,
  email_verification_token_hash VARCHAR(255) NULL,
  email_verification_expires_at DATETIME NULL,
  email_verified_at TIMESTAMP NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'customer',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
);

CREATE TABLE IF NOT EXISTS pending_user_registrations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(120) NULL,
  last_name VARCHAR(120) NULL,
  company_name VARCHAR(255) NULL,
  vat_number VARCHAR(120) NULL,
  phone VARCHAR(80) NULL,
  verification_token_hash VARCHAR(255) NOT NULL,
  verification_expires_at DATETIME NOT NULL,
  accepted_terms TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pending_user_registrations_email (email),
  UNIQUE KEY uq_pending_user_registrations_token (verification_token_hash)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  box_type_id INT UNSIGNED NULL,
  box_type_name VARCHAR(255) NOT NULL,
  cardboard_type VARCHAR(120) NOT NULL,
  cardboard_colour VARCHAR(120) NOT NULL,
  box_print VARCHAR(120) NOT NULL,
  length_mm INT NULL,
  width_mm INT NULL,
  height_mm INT NULL,
  size_type VARCHAR(120) NOT NULL,
  transport VARCHAR(120) NOT NULL,
  quantity INT NOT NULL,
  ftl TINYINT(1) NOT NULL DEFAULT 0,
  attachment_name VARCHAR(255) NULL,
  attachment_object_name VARCHAR(500) NULL,
  attachment_url VARCHAR(1000) NULL,
  message TEXT NOT NULL,
  items_json LONGTEXT NULL,
  accepted_terms TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(40) NOT NULL DEFAULT 'new',
  stripe_session_id VARCHAR(255) NULL,
  stripe_payment_intent_id VARCHAR(255) NULL,
  payment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  total_amount_cents INT UNSIGNED NULL,
  subtotal_cents INT UNSIGNED NULL,
  vat_percent DECIMAL(6,2) NULL,
  vat_cents INT UNSIGNED NULL,
  shipping_cents INT UNSIGNED NULL,
  shipping_method VARCHAR(120) NULL,
  shipping_eta VARCHAR(120) NULL,
  offer_sent_at TIMESTAMP NULL,
  offer_sent_from VARCHAR(255) NULL,
  currency VARCHAR(10) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,
  INDEX idx_orders_stripe_session_id (stripe_session_id)
);

CREATE TABLE IF NOT EXISTS addresses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  label VARCHAR(80) NULL,
  company_name VARCHAR(255) NULL,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  phone VARCHAR(80) NULL,
  address_line_1 VARCHAR(255) NOT NULL,
  address_line_2 VARCHAR(255) NULL,
  postcode VARCHAR(40) NOT NULL,
  city VARCHAR(120) NOT NULL,
  country VARCHAR(120) NOT NULL,
  is_default_billing TINYINT(1) NOT NULL DEFAULT 0,
  is_default_shipping TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  INDEX idx_addresses_user (user_id)
);

CREATE TABLE IF NOT EXISTS contacts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  first_name VARCHAR(120) NOT NULL,
  surname VARCHAR(120) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  vat_number VARCHAR(120) NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(80) NOT NULL,
  address VARCHAR(255) NOT NULL,
  postcode VARCHAR(40) NOT NULL,
  city VARCHAR(120) NOT NULL,
  country VARCHAR(120) NOT NULL,
  create_account TINYINT(1) NOT NULL DEFAULT 0,
  consent_phone TINYINT(1) NOT NULL DEFAULT 0,
  consent_email TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_contacts_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  consent TINYINT(1) NOT NULL DEFAULT 1,
  locale VARCHAR(10) NULL,
  source VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_newsletter_subscribers_email (email)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NULL,
  vat_number VARCHAR(64) NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  country VARCHAR(80) NULL,
  message TEXT NOT NULL,
  attachment_names TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  reply_message TEXT NULL,
  replied_at TIMESTAMP NULL DEFAULT NULL,
  replied_from VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_contact_messages_created_at (created_at)
);

INSERT INTO box_types (id, title, `key`, is_active)
VALUES
  (1, 'Boxfix, E-commerce Boxes Fefco 703 - B Wave', 'boxfix-fefco-703-b-wave', 1),
  (2, 'Flaps Box - Fefco 201', 'flaps-box-fefco-201', 1),
  (3, 'Shipping Box With Tape And Tear Strip - Fefco 427 (Size: 343X245X47 mm) - B Wave', 'shipping-box-tape-tear-strip-fefco-427', 1),
  (4, 'Shipping Box - Fefco 427 (Size: 343X245X47 mm) - B Wave', 'shipping-box-fefco-427', 1),
  (5, 'Footwear shipping box - Boxfix (Size: 350x255x135 mm) - B Wave', 'footwear-shipping-box-boxfix', 1),
  (6, 'Flat Box (Size: 220x155x39 mm, A5 - DIN)', 'flat-box-a5-din', 1),
  (7, 'Pizza Box (Size: 325x325x39mm) - E Wave', 'pizza-box-325x325x39-e-wave', 1),
  (8, 'Height Adjustable Shipping Box - Fefco 710, B Wave', 'height-adjustable-shipping-box-fefco-710', 1),
  (9, 'Corrugated cardboard envelope', 'corrugated-cardboard-envelope', 1);

INSERT INTO shipping_methods
  (method_key, name, eta_text, price, is_active, sort_order)
VALUES
  ('own-transport', 'Own transport', 'Customer pickup / own carrier', 0.00, 1, 0),
  ('standard', 'Standard Delivery', 'Estimated 7-10 days', 25.00, 1, 1),
  ('express', 'Express Delivery', 'Estimated 2-4 days', 40.00, 1, 2);

INSERT INTO box_type_images
  (box_type_id, url, sort_order, alt_text, is_primary)
VALUES
  (1, '/ecommerce/2.png', 0, 'FEFCO box preview 1', 0),
  (1, '/ecommerce/3.png', 1, 'FEFCO box preview 2', 1),
  (1, '/ecommerce/4.png', 2, 'FEFCO box preview 3', 0),
  (1, '/ecommerce/5.png', 3, 'FEFCO box preview 4', 0),
  (1, '/ecommerce/8.png', 4, 'FEFCO box preview 5', 0),
  (1, '/ecommerce/open-box.png', 5, 'FEFCO box open preview', 0),
  (1, '/ecommerce/sqashed.png', 6, 'FEFCO box squashed preview', 0),
  (2, '/b2b/boxes/flaps_box.png', 0, 'Flaps box preview', 1),
  (2, '/b2b/boxes/flaps_box.png', 1, 'Flaps box detail', 0),
  (3, '/b2b/boxes/tear_strip.png', 0, 'Shipping box with tear strip preview', 1),
  (3, '/b2b/boxes/tear_strip.png', 1, 'Shipping box with tear strip detail', 0),
  (4, '/b2b/boxes/felco.png', 0, 'Shipping box preview', 1),
  (4, '/b2b/boxes/felco.png', 1, 'Shipping box detail', 0),
  (5, '/b2b/boxes/footwear.png', 0, 'Footwear box preview', 1),
  (5, '/b2b/boxes/footwear.png', 1, 'Footwear box detail', 0),
  (6, '/b2b/boxes/flat_box.png', 0, 'Flat box preview', 1),
  (6, '/b2b/boxes/flat_box.png', 1, 'Flat box detail', 0),
  (7, '/b2b/boxes/pizza.png', 0, 'Pizza box preview', 1),
  (7, '/b2b/boxes/pizza.png', 1, 'Pizza box detail', 0),
  (8, '/b2b/boxes/adjustable.png', 0, 'Adjustable shipping box preview', 1),
  (8, '/b2b/boxes/adjustable.png', 1, 'Adjustable shipping box detail', 0),
  (9, '/b2b/boxes/envelope.png', 0, 'Cardboard envelope preview', 1),
  (9, '/b2b/boxes/envelope.png', 1, 'Cardboard envelope detail', 0);

INSERT INTO box_type_products
  (box_type_id, item_no, product_name, internal_l_mm, internal_w_mm, internal_h_mm, quality_cardboard, pallet_l_cm, pallet_w_cm, pallet_h_cm, weight_piece_gr, weight_pallet_kg, amount_qty_in_pcs, pallet_pcs)
VALUES
  (1, 'BF10', 'BF10 BOXFIX', 160, 130, 80, '1.21B-31', 120, 85, 160, 63, 219, 100, 3200),
  (1, 'BF11', 'BF11 BOXFIX', 200, 150, 150, '1.21B-31', 125, 80, 160, 98, 177, 100, 1600),
  (1, 'BF15', 'BF15 BOXFIX', 210, 210, 100, '1.21B-31', 124, 80, 160, 122, 166, 100, 1200),
  (1, 'BF20', 'BF20 BOXFIX', 215, 155, 110, '1.21B-31', 120, 84, 180, 95, 208, 100, 1980),
  (1, 'BF20E', 'BF20E BOXFIX', 216, 156, 112, '1.20E-21', 120, 80, 180, 84, 292, 100, 3240),
  (1, 'BF22', 'BF22 BOXFIX', 215, 180, 130, '1.21B-31', 140, 80, 160, 119, 206, 100, 1560),
  (1, 'BF30', 'BF30 BOXFIX', 230, 162, 80, '1.21B-31', 128, 80, 160, 94, 208, 100, 2000),
  (1, 'BF30E', 'BF30E BOXFIX', 231, 151, 82, '1.20E-21', 120, 80, 180, 83, 319, 100, 3600),
  (1, 'BF33', 'BF33 BOXFIX', 260, 222, 130, '1.21B-31', 120, 85, 180, 164, 200, 100, 1100),
  (1, 'BF35', 'BF35 BOXFIX', 306, 216, 140, '1.21B-31', 120, 90, 160, 205, 200, 100, 880),
  (1, 'BF37', 'BF37 BOXFIX', 290, 190, 82, '1.21B-31', 120, 80, 160, 169, 155, 100, 800),
  (1, 'BF40', 'BF40 BOXFIX', 312, 232, 82, '1.21B-31', 280, 88, 132, 192, 174, 100, 800),
  (1, 'BF41', 'BF41 BOXFIX', 312, 230, 112, '1.21B-31', 120, 80, 160, 182, 165, 100, 800),
  (1, 'BF42', 'BF42 BOXFIX', 312, 230, 162, '1.21B-31', 120, 82, 160, 203, 182, 100, 800),
  (1, 'BF50', 'BF50 BOXFIX', 350, 255, 135, '1.21B-31', 123, 80, 160, 225, 200, 100, 800),
  (1, 'BF55', 'BF55 BOXFIX', 392, 292, 180, '1.21B-31', 120, 80, 160, 305, 143, 100, 400),
  (2, 'F201-D1', 'DUMMY FLAPS BOX FEFCO 201', 300, 200, 150, '1.21B-31', 120, 80, 160, 150, 220, 100, 1400),
  (3, 'TS427-D1', 'DUMMY SHIPPING BOX TAPE TEAR STRIP', 343, 245, 47, '1.21B-31', 120, 80, 160, 140, 210, 100, 1600),
  (4, 'F427-D1', 'DUMMY SHIPPING BOX FEFCO 427', 343, 245, 47, '1.21B-31', 120, 80, 160, 135, 205, 100, 1700),
  (5, 'FW-D1', 'DUMMY FOOTWEAR SHIPPING BOX', 350, 255, 135, '1.21B-31', 123, 80, 160, 225, 200, 100, 800),
  (6, 'FLAT-D1', 'DUMMY FLAT BOX A5 DIN', 220, 155, 39, '1.20E-21', 120, 80, 160, 90, 180, 100, 2200),
  (7, 'PIZZA-D1', 'DUMMY PIZZA BOX 325x325x39', 325, 325, 39, '1.20E-21', 120, 80, 160, 120, 190, 100, 1500),
  (8, 'ADJ710-D1', 'DUMMY HEIGHT ADJUSTABLE BOX FEFCO 710', 360, 260, 200, '1.21B-31', 120, 80, 170, 240, 210, 100, 900),
  (9, 'M1-EV', 'M1-EV CARDBOARD ENVELOPE 255x220', 255, 220, 70, '1.20-21 E', 120, 80, 160, 84, 292, 100, 5000),
  (9, 'M2-EV', 'M2-EV CARDBOARD ENVELOPE 250x165', 250, 165, 70, '1.20-21 E', 120, 80, 160, 84, 292, 100, 6000),
  (9, 'M3-EV', 'M3-EV CARDBOARD ENVELOPE 282x205', 282, 205, 70, '1.20-21 E', 120, 80, 160, 84, 292, 100, 3000),
  (9, 'M4-EV', 'M4-EV CARDBOARD ENVELOPE 312x250', 312, 250, 70, '1.20-21 E', 120, 80, 160, 84, 292, 100, 3000),
  (9, 'M5-EV', 'M4-EV CARDBOARD ENVELOPE 350x250', 350, 250, 70, '1.20-21 E', 120, 80, 160, 84, 292, 100, 2400);

INSERT INTO box_type_product_prices
  (box_type_product_id, price_name, price_without_tax)
SELECT
  btp.id,
  tiers.price_name,
  ROUND(bp.base_price * tiers.discount_factor, 2) AS price_without_tax
FROM box_type_products btp
JOIN (
  SELECT
    id,
    GREATEST(
      0.18,
      (
        (
          0.14
          + ((internal_l_mm * internal_w_mm) / 110000.0)
          + (internal_h_mm / 950.0)
        )
        * CASE
            WHEN quality_cardboard LIKE '%B%' THEN 1.16
            WHEN quality_cardboard LIKE '%E%' THEN 1.03
            ELSE 1.09
          END
        * (0.92 + (RAND() * 0.34))
      )
    ) AS base_price
  FROM box_type_products
) bp ON bp.id = btp.id
JOIN (
  SELECT '300' AS price_name, 1.00 AS discount_factor
  UNION ALL SELECT '500', 0.87
  UNION ALL SELECT 'Pallet', 0.80
) tiers
;
