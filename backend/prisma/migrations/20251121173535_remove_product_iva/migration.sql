/*
  Warnings:

  - You are about to drop the column `defaultTaxRate` on the `Product` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CASHIER');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "defaultTaxRate";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CASHIER';
