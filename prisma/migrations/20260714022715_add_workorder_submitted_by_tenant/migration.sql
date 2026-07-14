-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "submittedByTenantId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_submittedByTenantId_fkey" FOREIGN KEY ("submittedByTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
