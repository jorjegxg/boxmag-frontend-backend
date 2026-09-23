-- Shorten box_types titles: drop cardboard wave and size suffixes.
-- Keys (slugs) stay unchanged so product URLs remain stable.

UPDATE box_types SET title = 'BoxFix, E-commerce Boxes Fefco 703'
WHERE `key` = 'boxfix-fefco-703-b-wave';

UPDATE box_types SET title = 'Shipping Box With Tape And Tear Strip - Fefco 427'
WHERE `key` = 'shipping-box-tape-tear-strip-fefco-427';

UPDATE box_types SET title = 'Shipping Box - Fefco 427'
WHERE `key` = 'shipping-box-fefco-427';

UPDATE box_types SET title = 'Footwear shipping box - Boxfix'
WHERE `key` = 'footwear-shipping-box-boxfix';

UPDATE box_types SET title = 'Flat Box'
WHERE `key` = 'flat-box-a5-din';

UPDATE box_types SET title = 'Pizza Box'
WHERE `key` = 'pizza-box-325x325x39-e-wave';

UPDATE box_types SET title = 'Height Adjustable Shipping Box - Fefco 710'
WHERE `key` = 'height-adjustable-shipping-box-fefco-710';
