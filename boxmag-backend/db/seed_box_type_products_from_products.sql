START TRANSACTION;

-- Keep only base box types in seeds.
INSERT INTO box_types (id, `key`, title, image_path, is_active)
VALUES
  (1, 'ecommerce_boxes_fefco_703', 'Boxfix, E-commerce Boxes Fefco 703 - B Wave', '/b2b/boxes/ecommerce.png', 1),
  (2, 'flaps_box_fefco_201', 'Flaps Box - Fefco 201', '/b2b/boxes/flaps_box.png', 1),
  (3, 'shipping_box_with_tape_and_tear_strip_fefco_427', 'Shipping Box With Tape And Tear Strip - Fefco 427 (Size: 343X245X47 mm) - B Wave', '/b2b/boxes/tear_strip.png', 1),
  (4, 'shipping_box_fefco_427', 'Shipping Box - Fefco 427 (Size: 343X245X47 mm) - B Wave', '/b2b/boxes/felco.png', 1),
  (5, 'footwear_shipping_box_boxfix', 'Footwear shipping box - Boxfix (Size: 350x255x135 mm) - B Wave', '/b2b/boxes/footwear.png', 1),
  (6, 'flat_box', 'Flat Box (Size: 220x155x39 mm, A5 - DIN)', '/b2b/boxes/flat_box.png', 1),
  (7, 'pizza_box', 'Pizza Box (Size: 325x325x39mm) - E Wave', '/b2b/boxes/pizza.png', 1),
  (8, 'height_adjustable_shipping_box', 'Height Adjustable Shipping Box - Fefco 710, B Wave', '/b2b/boxes/adjustable.png', 1)
ON DUPLICATE KEY UPDATE
  id = id,
  title = VALUES(title),
  image_path = VALUES(image_path),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO box_type_products
  (box_type_id, item_no, product_name, internal_l_mm, internal_w_mm, internal_h_mm, quality_cardboard, pallet_l_cm, pallet_w_cm, pallet_h_cm, weight_piece_gr, weight_pallet_kg, amount_qty_in_pcs, pallet_pcs)
VALUES
  (1, 'BF10', 'BF10 BOXFIX', 160, 130, 80, '1.21B-31', 120, 85, 160, 63, 219, 20, 3200),
  (1, 'BF11', 'BF11 BOXFIX', 200, 150, 150, '1.21B-31', 125, 80, 160, 98, 177, 20, 1600),
  (1, 'BF15', 'BF15 BOXFIX', 210, 210, 100, '1.21B-31', 124, 80, 160, 122, 166, 20, 1200),
  (1, 'BF20', 'BF20 BOXFIX', 215, 155, 110, '1.21B-31', 120, 84, 180, 95, 208, 20, 1980),
  (1, 'BF20E', 'BF20E BOXFIX', 216, 156, 112, '1.20E-21', 120, 80, 180, 84, 292, 20, 3240),
  (1, 'BF22', 'BF22 BOXFIX', 215, 180, 130, '1.21B-31', 140, 80, 160, 119, 206, 20, 1560),
  (1, 'BF30', 'BF30 BOXFIX', 230, 162, 80, '1.21B-31', 128, 80, 160, 94, 208, 20, 2000),
  (1, 'BF30E', 'BF30E BOXFIX', 231, 151, 82, '1.20E-21', 120, 80, 180, 83, 319, 20, 3600),
  (1, 'BF33', 'BF33 BOXFIX', 260, 222, 130, '1.21B-31', 120, 85, 180, 164, 200, 20, 1100),
  (1, 'BF35', 'BF35 BOXFIX', 306, 216, 140, '1.21B-31', 120, 90, 160, 205, 200, 20, 880),
  (1, 'BF37', 'BF37 BOXFIX', 290, 190, 82, '1.21B-31', 120, 80, 160, 169, 155, 20, 800),
  (1, 'BF40', 'BF40 BOXFIX', 312, 232, 82, '1.21B-31', 280, 88, 132, 192, 174, 20, 800),
  (1, 'BF41', 'BF41 BOXFIX', 312, 230, 112, '1.21B-31', 120, 80, 160, 182, 165, 20, 800),
  (1, 'BF42', 'BF42 BOXFIX', 312, 230, 162, '1.21B-31', 120, 82, 160, 203, 182, 20, 800),
  (1, 'BF50', 'BF50 BOXFIX', 350, 255, 135, '1.21B-31', 123, 80, 160, 225, 200, 20, 800),
  (1, 'BF55', 'BF55 BOXFIX', 392, 292, 180, '1.21B-31', 120, 80, 160, 305, 143, 20, 400);

INSERT INTO box_type_product_prices
  (box_type_product_id, price_name, price_without_tax, price_with_tax)
SELECT btp.id, p.price_name, p.price_without_tax, p.price_with_tax
FROM box_type_products btp
JOIN (
  SELECT 'BF10' AS item_no, '100' AS price_name, 0.84 AS price_without_tax, 1.00 AS price_with_tax
  UNION ALL SELECT 'BF10','300',0.84,1.00
  UNION ALL SELECT 'BF10','500',0.84,1.00
  UNION ALL SELECT 'BF10','Pallet',0.84,1.00
  UNION ALL SELECT 'BF11','100',0.84,1.00
  UNION ALL SELECT 'BF11','300',0.84,1.00
  UNION ALL SELECT 'BF11','500',0.84,1.00
  UNION ALL SELECT 'BF11','Pallet',0.84,1.00
  UNION ALL SELECT 'BF15','100',0.84,1.00
  UNION ALL SELECT 'BF15','300',0.84,1.00
  UNION ALL SELECT 'BF15','500',0.84,1.00
  UNION ALL SELECT 'BF15','Pallet',0.84,1.00
  UNION ALL SELECT 'BF20','100',0.84,1.00
  UNION ALL SELECT 'BF20','300',0.84,1.00
  UNION ALL SELECT 'BF20','500',0.84,1.00
  UNION ALL SELECT 'BF20','Pallet',0.84,1.00
  UNION ALL SELECT 'BF20E','100',0.84,1.00
  UNION ALL SELECT 'BF20E','300',0.84,1.00
  UNION ALL SELECT 'BF20E','500',0.84,1.00
  UNION ALL SELECT 'BF20E','Pallet',0.84,1.00
  UNION ALL SELECT 'BF22','100',0.84,1.00
  UNION ALL SELECT 'BF22','300',0.84,1.00
  UNION ALL SELECT 'BF22','500',0.84,1.00
  UNION ALL SELECT 'BF22','Pallet',0.84,1.00
  UNION ALL SELECT 'BF30','100',0.84,1.00
  UNION ALL SELECT 'BF30','300',0.84,1.00
  UNION ALL SELECT 'BF30','500',0.84,1.00
  UNION ALL SELECT 'BF30','Pallet',0.84,1.00
  UNION ALL SELECT 'BF30E','100',0.84,1.00
  UNION ALL SELECT 'BF30E','300',0.84,1.00
  UNION ALL SELECT 'BF30E','500',0.84,1.00
  UNION ALL SELECT 'BF30E','Pallet',0.84,1.00
  UNION ALL SELECT 'BF33','100',0.84,1.00
  UNION ALL SELECT 'BF33','300',0.84,1.00
  UNION ALL SELECT 'BF33','500',0.84,1.00
  UNION ALL SELECT 'BF33','Pallet',0.84,1.00
  UNION ALL SELECT 'BF35','100',0.84,1.00
  UNION ALL SELECT 'BF35','300',0.84,1.00
  UNION ALL SELECT 'BF35','500',0.84,1.00
  UNION ALL SELECT 'BF35','Pallet',0.84,1.00
  UNION ALL SELECT 'BF37','100',0.84,1.00
  UNION ALL SELECT 'BF37','300',0.84,1.00
  UNION ALL SELECT 'BF37','500',0.84,1.00
  UNION ALL SELECT 'BF37','Pallet',0.84,1.00
  UNION ALL SELECT 'BF40','100',0.84,1.00
  UNION ALL SELECT 'BF40','300',0.84,1.00
  UNION ALL SELECT 'BF40','500',0.84,1.00
  UNION ALL SELECT 'BF40','Pallet',0.84,1.00
  UNION ALL SELECT 'BF41','100',0.84,1.00
  UNION ALL SELECT 'BF41','300',0.84,1.00
  UNION ALL SELECT 'BF41','500',0.84,1.00
  UNION ALL SELECT 'BF41','Pallet',0.84,1.00
  UNION ALL SELECT 'BF42','100',0.84,1.00
  UNION ALL SELECT 'BF42','300',0.84,1.00
  UNION ALL SELECT 'BF42','500',0.84,1.00
  UNION ALL SELECT 'BF42','Pallet',0.84,1.00
  UNION ALL SELECT 'BF50','100',0.84,1.00
  UNION ALL SELECT 'BF50','300',0.84,1.00
  UNION ALL SELECT 'BF50','500',0.84,1.00
  UNION ALL SELECT 'BF50','Pallet',0.84,1.00
  UNION ALL SELECT 'BF55','100',0.84,1.00
  UNION ALL SELECT 'BF55','300',0.84,1.00
  UNION ALL SELECT 'BF55','500',0.84,1.00
  UNION ALL SELECT 'BF55','Pallet',0.84,1.00
) p ON p.item_no = btp.item_no
WHERE btp.box_type_id = 1;

COMMIT;
