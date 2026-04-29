BEGIN;

SET search_path TO world_cup, public;

-- Requires `sql/ddl.sql` and `sql/synthetic_support.sql` to be applied first.
SELECT * FROM world_cup.fn_seed_synthetic_data();

COMMIT;
