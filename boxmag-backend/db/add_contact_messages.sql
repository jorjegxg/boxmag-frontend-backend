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
