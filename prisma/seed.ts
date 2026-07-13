import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const url = new URL(process.env.DATABASE_URL!)
const schema = url.searchParams.get('schema') ?? undefined
url.searchParams.delete('pgbouncer')
url.searchParams.delete('connection_limit')
url.searchParams.delete('schema')
const adapter = new PrismaPg({ connectionString: url.toString() }, { schema })
const prisma = new PrismaClient({ adapter })

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: 'org-default' },
    update: {},
    create: { id: 'org-default', name: 'Default Management Co.' },
  })

  const hashedPassword = await bcrypt.hash('Admin@1234', 12)
  await prisma.user.upsert({
    where: { userName: 'admin' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Admin User',
      email: 'admin@apartment.local',
      userName: 'admin',
      password: hashedPassword,
      role: 'admin',
    },
  })

  const chartOfAccounts = [
    { glNumber: '1000', glName: 'Operating Cash', glType: 'Asset' },
    { glNumber: '1500', glName: 'Rent Receivable', glType: 'Asset' },
    { glNumber: '1700', glName: 'Vendor Credit', glType: 'Asset' },
    { glNumber: '2000', glName: 'Accounts Payable', glType: 'Liability' },
    { glNumber: '2200', glName: 'Security Deposits Held', glType: 'Liability' },
    { glNumber: '2300', glName: 'Prepaid Rent', glType: 'Liability' },
    { glNumber: '3000', glName: 'Owner Distributions', glType: 'Equity' },
    { glNumber: '4000', glName: 'Rental Income', glType: 'Income' },
    { glNumber: '4100', glName: 'Other Income', glType: 'Income' },
  ]
  for (const gl of chartOfAccounts) {
    await prisma.chartOfAccount.upsert({
      where: { organizationId_glNumber: { organizationId: org.id, glNumber: gl.glNumber } },
      update: {},
      create: { organizationId: org.id, ...gl },
    })
  }

  console.log('Seeded organization + admin user (userName: admin / password: Admin@1234) + starter chart of accounts')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
