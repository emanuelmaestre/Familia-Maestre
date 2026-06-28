-- Remove modules no longer supported by the application:
-- inventory/stock and task/responsibility management.

ALTER TABLE "shopping_items" DROP CONSTRAINT IF EXISTS "shopping_items_inventoryItemId_fkey";
ALTER TABLE "shopping_items" DROP COLUMN IF EXISTS "inventoryItemId";

DROP TABLE IF EXISTS "inventory_entries";
DROP TABLE IF EXISTS "inventory_items";
DROP TABLE IF EXISTS "inventory_categories";

DROP TABLE IF EXISTS "task_completions";
DROP TABLE IF EXISTS "task_assignments";
DROP TABLE IF EXISTS "tasks";
