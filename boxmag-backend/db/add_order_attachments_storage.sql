-- Adds storage columns for uploaded order attachments (MinIO object + URL).
-- Safe to re-run.

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

CALL boxmag_add_column_if_missing('orders', 'attachment_object_name', 'VARCHAR(500) NULL AFTER attachment_name');
CALL boxmag_add_column_if_missing('orders', 'attachment_url', 'VARCHAR(1000) NULL AFTER attachment_object_name');

DROP PROCEDURE IF EXISTS boxmag_add_column_if_missing;
