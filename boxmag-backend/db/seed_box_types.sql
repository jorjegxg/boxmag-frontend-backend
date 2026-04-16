-- CREATE TABLE IF NOT EXISTS box_types (
--   id INT UNSIGNED NOT NULL PRIMARY KEY,
--   `key` VARCHAR(150) NOT NULL UNIQUE,
--   title VARCHAR(255) NOT NULL,
--   price_eur DECIMAL(10,2) NULL,
--   image_path VARCHAR(500) NOT NULL,
--   is_active TINYINT(1) NOT NULL DEFAULT 1,
--   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
-- );

-- ALTER TABLE box_types
--   ADD COLUMN IF NOT EXISTS price_eur DECIMAL(10,2) NULL AFTER title;

INSERT INTO box_types (id, `key`, title, price_eur, image_path, is_active)
VALUES
  (1, 'ecommerce_boxes_fefco_703', 'Boxfix, E-commerce Boxes Fefco 703 - B Wave', 1.20, '/b2b/boxes/ecommerce.png', 1),
  (2, 'flaps_box_fefco_201', 'Flaps Box - Fefco 201', 1.55, '/b2b/boxes/flaps_box.png', 1),
  (3, 'shipping_box_with_tape_and_tear_strip_fefco_427', 'Shipping Box With Tape And Tear Strip - Fefco 427 (Size: 343X245X47 mm) - B Wave', 1.45, '/b2b/boxes/tear_strip.png', 1),
  (4, 'shipping_box_fefco_427', 'Shipping Box - Fefco 427 (Size: 343X245X47 mm) - B Wave', 1.35, '/b2b/boxes/felco.png', 1),
  (5, 'footwear_shipping_box_boxfix', 'Footwear shipping box - Boxfix (Size: 350x255x135 mm) - B Wave', 1.60, '/b2b/boxes/footwear.png', 1),
  (6, 'flat_box', 'Flat Box (Size: 220x155x39 mm, A5 - DIN)', 0.95, '/b2b/boxes/flat_box.png', 1),
  (7, 'pizza_box', 'Pizza Box (Size: 325x325x39mm) - E Wave', 0.88, '/b2b/boxes/pizza.png', 1),
  (8, 'height_adjustable_shipping_box', 'Height Adjustable Shipping Box - Fefco 710, B Wave', 1.75, '/b2b/boxes/adjustable.png', 1)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  price_eur = VALUES(price_eur),
  image_path = VALUES(image_path),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;
