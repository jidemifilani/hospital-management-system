-- CreateEnum
CREATE TYPE "OnlineOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "online_orders" (
    "id"              TEXT NOT NULL,
    "orderNumber"     TEXT NOT NULL,
    "patientId"       TEXT NOT NULL,
    "invoiceId"       TEXT NOT NULL,
    "status"          "OnlineOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "deliveryMethod"  TEXT NOT NULL DEFAULT 'PICKUP',
    "deliveryAddress" TEXT,
    "notes"           TEXT,
    "organizationId"  TEXT NOT NULL,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_order_items" (
    "id"        TEXT NOT NULL,
    "orderId"   TEXT NOT NULL,
    "itemId"    TEXT NOT NULL,
    "quantity"  INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total"     DECIMAL(10,2) NOT NULL,

    CONSTRAINT "online_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "online_orders_orderNumber_key" ON "online_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "online_orders_invoiceId_key" ON "online_orders"("invoiceId");

-- CreateIndex
CREATE INDEX "online_orders_organizationId_status_idx" ON "online_orders"("organizationId", "status");

-- CreateIndex
CREATE INDEX "online_orders_patientId_idx" ON "online_orders"("patientId");

-- CreateIndex
CREATE INDEX "online_order_items_orderId_idx" ON "online_order_items"("orderId");

-- AddForeignKey
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_orders" ADD CONSTRAINT "online_orders_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_order_items" ADD CONSTRAINT "online_order_items_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "online_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_order_items" ADD CONSTRAINT "online_order_items_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
