-- Adds structured cart items + price breakdown columns to the orders table.
-- Safe to re-run: uses a helper procedure that only adds columns when missing
-- (MySQL 8 does not support `ADD COLUMN IF NOT EXISTS`).

DROP PROCEDURE IF EXISTS boxmag_add_column_if_missing;

DELIMITER $$
CREATE PROCEDURE boxmag_add_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND column_name = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL boxmag_add_column_if_missing('orders', 'items_json',      'LONGTEXT NULL AFTER message');
CALL boxmag_add_column_if_missing('orders', 'subtotal_cents',  'INT UNSIGNED NULL AFTER total_amount_cents');
CALL boxmag_add_column_if_missing('orders', 'vat_percent',     'DECIMAL(6,2) NULL AFTER subtotal_cents');
CALL boxmag_add_column_if_missing('orders', 'vat_cents',       'INT UNSIGNED NULL AFTER vat_percent');
CALL boxmag_add_column_if_missing('orders', 'shipping_cents',  'INT UNSIGNED NULL AFTER vat_cents');
CALL boxmag_add_column_if_missing('orders', 'shipping_method', 'VARCHAR(120) NULL AFTER shipping_cents');
CALL boxmag_add_column_if_missing('orders', 'shipping_eta',    'VARCHAR(120) NULL AFTER shipping_method');

DROP PROCEDURE IF EXISTS boxmag_add_column_if_missing;
