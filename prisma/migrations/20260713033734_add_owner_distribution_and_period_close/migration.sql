-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "closedThrough" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OwnerDistribution" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerDistribution_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OwnerDistribution" ADD CONSTRAINT "OwnerDistribution_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerDistribution" ADD CONSTRAINT "OwnerDistribution_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerDistribution" ADD CONSTRAINT "OwnerDistribution_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
