-- Adds Stripe payment tracking columns to the orders table.
-- Safe to re-run: helper procedure (MySQL 8 has no ADD COLUMN IF NOT EXISTS).

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

CALL boxmag_add_column_if_missing('orders', 'stripe_session_id', 'VARCHAR(255) NULL AFTER status');
CALL boxmag_add_column_if_missing('orders', 'stripe_payment_intent_id', 'VARCHAR(255) NULL AFTER stripe_session_id');
CALL boxmag_add_column_if_missing('orders', 'payment_status', 'VARCHAR(40) NOT NULL DEFAULT ''pending'' AFTER stripe_payment_intent_id');
CALL boxmag_add_column_if_missing('orders', 'total_amount_cents', 'INT UNSIGNED NULL AFTER payment_status');
CALL boxmag_add_column_if_missing('orders', 'currency', 'VARCHAR(10) NULL AFTER total_amount_cents');

DROP PROCEDURE IF EXISTS boxmag_add_column_if_missing;

DROP PROCEDURE IF EXISTS boxmag_add_index_if_missing;

DELIMITER $$
CREATE PROCEDURE boxmag_add_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_columns TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND index_name = p_index
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_columns, ')');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL boxmag_add_index_if_missing('orders', 'idx_orders_stripe_session_id', 'stripe_session_id');

DROP PROCEDURE IF EXISTS boxmag_add_index_if_missing;
