SET @demo_user_id := (
  SELECT id
  FROM users
  WHERE email = 'customer.demo@boxmag.com'
  LIMIT 1
);

DELETE c
FROM contacts c
JOIN orders o ON o.id = c.order_id
WHERE o.message LIKE '[DEV-SEED]%';

DELETE FROM orders
WHERE message LIKE '[DEV-SEED]%';

INSERT INTO orders
  (
    user_id, box_type_id, box_type_name, cardboard_type, cardboard_colour, box_print,
    length_mm, width_mm, height_mm, size_type, transport, quantity, ftl, attachment_name,
    message, accepted_terms, status
  )
SELECT
  @demo_user_id, 1, 'Boxfix, E-commerce Boxes Fefco 703 - B Wave', '1.21B-31', 'Brown', 'No print',
  215, 155, 110, 'standard', 'courier', 240, 0, NULL,
  '[DEV-SEED] Demo order #1', 1, 'new'
WHERE @demo_user_id IS NOT NULL;

INSERT INTO orders
  (
    user_id, box_type_id, box_type_name, cardboard_type, cardboard_colour, box_print,
    length_mm, width_mm, height_mm, size_type, transport, quantity, ftl, attachment_name,
    message, accepted_terms, status
  )
SELECT
  @demo_user_id, 4, 'Shipping Box - Fefco 427 (Size: 343X245X47 mm) - B Wave', '1.21B-31', 'White', 'Flexo 1 color',
  343, 245, 47, 'fixed', 'pallet', 120, 0, NULL,
  '[DEV-SEED] Demo order #2', 1, 'in progress'
WHERE @demo_user_id IS NOT NULL;

INSERT INTO orders
  (
    user_id, box_type_id, box_type_name, cardboard_type, cardboard_colour, box_print,
    length_mm, width_mm, height_mm, size_type, transport, quantity, ftl, attachment_name,
    message, accepted_terms, status
  )
SELECT
  @demo_user_id, 9, 'Corrugated cardboard envelope', '1.20-21 E', 'Brown', 'No print',
  255, 220, 70, 'fixed', 'courier', 500, 0, NULL,
  '[DEV-SEED] Demo order #3', 1, 'completed'
WHERE @demo_user_id IS NOT NULL;

INSERT INTO contacts
  (
    order_id, first_name, surname, company_name, vat_number, email, phone,
    address, postcode, city, country, create_account, consent_phone, consent_email
  )
SELECT
  o.id, 'Demo', 'Customer', 'Boxmag Demo SRL', 'RO12345678', 'customer.demo@boxmag.com', '+40 700 000 000',
  'Str. Exemplu 10', '010101', 'Bucuresti', 'Romania', 1, 1, 1
FROM orders o
WHERE o.message IN (
  '[DEV-SEED] Demo order #1',
  '[DEV-SEED] Demo order #2',
  '[DEV-SEED] Demo order #3'
);
