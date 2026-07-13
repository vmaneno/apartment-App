-- AlterTable
ALTER TABLE "TransactionLine" ADD COLUMN     "cleared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clearedAt" TIMESTAMP(3);
