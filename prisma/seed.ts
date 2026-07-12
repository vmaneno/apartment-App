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

  console.log('Seeded organization + admin user (userName: admin / password: Admin@1234)')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
