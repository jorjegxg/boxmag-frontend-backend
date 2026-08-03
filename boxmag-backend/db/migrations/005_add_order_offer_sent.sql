-- Adds offer-email tracking columns to orders.
-- Safe to re-run (MySQL 8: helper procedure, no ADD COLUMN IF NOT EXISTS).

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

CALL boxmag_add_column_if_missing('orders', 'offer_sent_at', 'TIMESTAMP NULL DEFAULT NULL AFTER shipping_eta');
CALL boxmag_add_column_if_missing('orders', 'offer_sent_from', 'VARCHAR(255) NULL DEFAULT NULL AFTER offer_sent_at');

DROP PROCEDURE IF EXISTS boxmag_add_column_if_missing;
