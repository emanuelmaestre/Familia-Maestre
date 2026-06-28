CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD');

ALTER TABLE "transactions" ADD COLUMN "paymentMethod" "PaymentMethod";
