-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_tenantId_fkey";

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "tenantId" DROP NOT NULL,
ALTER COLUMN "documentType" DROP NOT NULL,
ALTER COLUMN "identification" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
