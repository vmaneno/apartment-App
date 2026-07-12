-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Individual',
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOwner" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownershipPercent" DOUBLE PRECISION NOT NULL DEFAULT 100,

    CONSTRAINT "PropertyOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagementAgreement" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "feePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leasingFeeAmount" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "ManagementAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "beds" INTEGER NOT NULL DEFAULT 0,
    "baths" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sqft" INTEGER,
    "marketRent" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "rentAmount" DOUBLE PRECISION NOT NULL,
    "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseTenant" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "LeaseTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseCharge" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "chargeType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentApplication" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "appliedAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PaymentApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "coiExpiresAt" TIMESTAMP(3),
    "w9OnFile" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "unitId" TEXT,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'Routine',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "assignedVendorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Operating',
    "glNumber" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartOfAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "glNumber" TEXT NOT NULL,
    "glName" TEXT NOT NULL,
    "glType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChartOfAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLine" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "propertyId" TEXT,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "TransactionLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_userName_key" ON "User"("userName");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyOwner_propertyId_ownerId_key" ON "PropertyOwner"("propertyId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagementAgreement_propertyId_key" ON "ManagementAgreement"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_propertyId_unitNumber_key" ON "Unit"("propertyId", "unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseTenant_leaseId_tenantId_key" ON "LeaseTenant"("leaseId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ChartOfAccount_organizationId_glNumber_key" ON "ChartOfAccount"("organizationId", "glNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyOwner" ADD CONSTRAINT "PropertyOwner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagementAgreement" ADD CONSTRAINT "ManagementAgreement_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lease" ADD CONSTRAINT "Lease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseTenant" ADD CONSTRAINT "LeaseTenant_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseTenant" ADD CONSTRAINT "LeaseTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseCharge" ADD CONSTRAINT "LeaseCharge_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentApplication" ADD CONSTRAINT "PaymentApplication_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentApplication" ADD CONSTRAINT "PaymentApplication_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "LeaseCharge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedVendorId_fkey" FOREIGN KEY ("assignedVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccount" ADD CONSTRAINT "ChartOfAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "ChartOfAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLine" ADD CONSTRAINT "TransactionLine_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
