import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

type BudgetEntry = { glAccountId: string; month: number; amount: number }

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  const { propertyId, year, entries } = data as { propertyId?: string; year?: number; entries?: BudgetEntry[] }
  if (!propertyId || !year || !Array.isArray(entries)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const property = await prisma.property.findFirst({ where: { id: propertyId, organizationId: session.organizationId } })
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  try {
    await prisma.$transaction(
      entries.map(e =>
        prisma.budget.upsert({
          where: { propertyId_glAccountId_year_month: { propertyId, glAccountId: e.glAccountId, year, month: e.month } },
          create: { organizationId: session.organizationId, propertyId, glAccountId: e.glAccountId, year, month: e.month, amount: e.amount },
          update: { amount: e.amount },
        })
      )
    )
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
