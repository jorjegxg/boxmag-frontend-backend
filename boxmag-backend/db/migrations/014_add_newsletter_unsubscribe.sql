-- Newsletter unsubscribe (GDPR): keep the row, clear consent, record when.
-- Re-subscribing sets consent = 1 and clears unsubscribed_at.

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'newsletter_subscribers'
    AND COLUMN_NAME = 'unsubscribed_at'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE newsletter_subscribers ADD COLUMN unsubscribed_at TIMESTAMP NULL DEFAULT NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
