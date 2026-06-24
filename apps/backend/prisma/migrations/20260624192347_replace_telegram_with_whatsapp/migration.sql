-- Replace Telegram fields with WhatsApp phone number

-- Add phone column (nullable first)
ALTER TABLE "users" ADD COLUMN "phone" TEXT;

-- Copy telegramId to phone for existing users
UPDATE "users" SET "phone" = "telegramId" WHERE "phone" IS NULL;

-- Make phone NOT NULL and unique
ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");

-- Remove telegram columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "telegramId";
ALTER TABLE "users" DROP COLUMN IF EXISTS "telegramHandle";

-- Remove old unique constraint if exists
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_telegramId_key";

-- Remove telegramMessageId from notifications (no longer needed)
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "telegramMessageId";
