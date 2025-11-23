-- CreateTable
CREATE TABLE "CashRegister" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftCloseout" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "closingTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashRegisterId" INTEGER NOT NULL,
    "startingBalance" DECIMAL(18,2) NOT NULL,
    "finalBalance" DECIMAL(18,2) NOT NULL,
    "salesTotal" DECIMAL(18,2) NOT NULL,
    "closedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftCloseout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashRegister_tenantId_idx" ON "CashRegister"("tenantId");

-- CreateIndex
CREATE INDEX "ShiftCloseout_tenantId_idx" ON "ShiftCloseout"("tenantId");

-- CreateIndex
CREATE INDEX "ShiftCloseout_cashRegisterId_idx" ON "ShiftCloseout"("cashRegisterId");

-- CreateIndex
CREATE INDEX "ShiftCloseout_closedByUserId_idx" ON "ShiftCloseout"("closedByUserId");

-- CreateIndex
CREATE INDEX "ShiftCloseout_closingTime_idx" ON "ShiftCloseout"("closingTime");

-- AddForeignKey
ALTER TABLE "CashRegister" ADD CONSTRAINT "CashRegister_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftCloseout" ADD CONSTRAINT "ShiftCloseout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftCloseout" ADD CONSTRAINT "ShiftCloseout_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftCloseout" ADD CONSTRAINT "ShiftCloseout_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
