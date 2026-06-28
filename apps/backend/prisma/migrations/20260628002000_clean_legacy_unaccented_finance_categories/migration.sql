DO $$
DECLARE
  old_id TEXT;
  new_id TEXT;
BEGIN
  SELECT id INTO old_id FROM "transaction_categories" WHERE "name" = 'Alimentacao' LIMIT 1;
  SELECT id INTO new_id FROM "transaction_categories" WHERE "name" = 'Alimentação' LIMIT 1;
  IF old_id IS NOT NULL AND new_id IS NOT NULL THEN
    UPDATE "transactions" SET "categoryId" = new_id WHERE "categoryId" = old_id;
    UPDATE "transaction_categories" SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = old_id;
  END IF;

  SELECT id INTO old_id FROM "transaction_categories" WHERE "name" = 'Saude' LIMIT 1;
  SELECT id INTO new_id FROM "transaction_categories" WHERE "name" = 'Saúde' LIMIT 1;
  IF old_id IS NOT NULL AND new_id IS NOT NULL THEN
    UPDATE "transactions" SET "categoryId" = new_id WHERE "categoryId" = old_id;
    UPDATE "transaction_categories" SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = old_id;
  END IF;

  SELECT id INTO old_id FROM "transaction_categories" WHERE "name" = 'Educacao' LIMIT 1;
  SELECT id INTO new_id FROM "transaction_categories" WHERE "name" = 'Educação' LIMIT 1;
  IF old_id IS NOT NULL AND new_id IS NOT NULL THEN
    UPDATE "transactions" SET "categoryId" = new_id WHERE "categoryId" = old_id;
    UPDATE "transaction_categories" SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = old_id;
  END IF;

  SELECT id INTO old_id FROM "transaction_categories" WHERE "name" = 'Salario' LIMIT 1;
  SELECT id INTO new_id FROM "transaction_categories" WHERE "name" = 'Salário' LIMIT 1;
  IF old_id IS NOT NULL AND new_id IS NOT NULL THEN
    UPDATE "transactions" SET "categoryId" = new_id WHERE "categoryId" = old_id;
    UPDATE "transaction_categories" SET "deletedAt" = CURRENT_TIMESTAMP WHERE id = old_id;
  END IF;
END $$;
