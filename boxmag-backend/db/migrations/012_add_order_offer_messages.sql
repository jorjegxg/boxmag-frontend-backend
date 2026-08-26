CREATE TABLE IF NOT EXISTS order_offer_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  from_key VARCHAR(64) NULL,
  from_email VARCHAR(255) NULL,
  message TEXT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_order_offer_messages_order_id (order_id),
  CONSTRAINT fk_order_offer_messages_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
