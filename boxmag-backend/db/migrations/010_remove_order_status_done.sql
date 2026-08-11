-- Collapse legacy terminal status `done` into `completed` (Finalizată).
UPDATE orders SET status = 'completed' WHERE status = 'done';
