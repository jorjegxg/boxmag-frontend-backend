ALTER TABLE orders
  ADD COLUMN offer_sent_at TIMESTAMP NULL DEFAULT NULL AFTER shipping_eta,
  ADD COLUMN offer_sent_from VARCHAR(255) NULL DEFAULT NULL AFTER offer_sent_at;
