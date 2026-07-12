import { PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL environment variable is not set')

  const url = new URL(raw)
  const schema = url.searchParams.get('schema') ?? undefined
  url.searchParams.delete('pgbouncer')
  url.searchParams.delete('connection_limit')
  url.searchParams.delete('schema')

  // The pg driver adapter doesn't honor `?schema=` in the connection string the way Prisma's
  // native engine does — it must be passed explicitly as an adapter option.
  const adapter = new PrismaPg({
    connectionString: url.toString(),
    max: 1,
    ssl: { rejectUnauthorized: false },
  }, { schema })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
