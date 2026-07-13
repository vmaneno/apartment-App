/*
  Warnings:

  - You are about to drop the column `glNumber` on the `BankAccount` table. All the data in the column will be lost.
  - Added the required column `glAccountId` to the `BankAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BankAccount" DROP COLUMN "glNumber",
ADD COLUMN     "glAccountId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
