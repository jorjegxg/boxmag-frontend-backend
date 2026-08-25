-- Password reset flow: dedicated token columns on users.
-- Raw token lives only in the emailed link; DB stores the sha256 hash.
-- Kept separate from email_verification_* to avoid semantic collisions.

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'password_reset_token_hash'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN password_reset_token_hash CHAR(64) NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'password_reset_expires_at'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN password_reset_expires_at DATETIME NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
