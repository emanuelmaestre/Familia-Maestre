CREATE TYPE "FiscalReceiptStatus" AS ENUM ('SCANNED', 'PROCESSING', 'REVIEWED', 'IMPORTED', 'ERROR');

CREATE TABLE "products" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "lastUnitPrice" DECIMAL(10,2),
  "unit" TEXT,
  "taxes" DECIMAL(10,2),
  "lastPurchasedAt" TIMESTAMP(3),
  "lastSupplierName" TEXT,
  "lastReceiptId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fiscal_receipts" (
  "id" TEXT NOT NULL,
  "qrCodeRaw" TEXT,
  "url" TEXT,
  "accessKey" TEXT,
  "supplierName" TEXT,
  "tradeName" TEXT,
  "documentNumber" TEXT,
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "paymentMethod" "PaymentMethod",
  "cardLast4" TEXT,
  "status" "FiscalReceiptStatus" NOT NULL DEFAULT 'SCANNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fiscal_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_history_items" (
  "id" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "unit" TEXT,
  "taxes" DECIMAL(10,2),
  "paymentMethod" "PaymentMethod",
  "accessKey" TEXT,
  "discount" DECIMAL(10,2),
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "purchaseDate" TIMESTAMP(3) NOT NULL,
  "cardLast4" TEXT,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "productId" TEXT,
  "receiptId" TEXT NOT NULL,
  CONSTRAINT "purchase_history_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transactions" ADD COLUMN "fiscalReceiptId" TEXT;

CREATE UNIQUE INDEX "products_name_key" ON "products"("name");
CREATE UNIQUE INDEX "fiscal_receipts_accessKey_key" ON "fiscal_receipts"("accessKey");
CREATE UNIQUE INDEX "transactions_fiscalReceiptId_key" ON "transactions"("fiscalReceiptId");
CREATE INDEX "fiscal_receipts_purchaseDate_idx" ON "fiscal_receipts"("purchaseDate");
CREATE INDEX "fiscal_receipts_documentNumber_idx" ON "fiscal_receipts"("documentNumber");
CREATE INDEX "purchase_history_items_productName_purchaseDate_idx" ON "purchase_history_items"("productName", "purchaseDate");
CREATE INDEX "purchase_history_items_receiptId_idx" ON "purchase_history_items"("receiptId");

ALTER TABLE "purchase_history_items" ADD CONSTRAINT "purchase_history_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_history_items" ADD CONSTRAINT "purchase_history_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "fiscal_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fiscalReceiptId_fkey" FOREIGN KEY ("fiscalReceiptId") REFERENCES "fiscal_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
