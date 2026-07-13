import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const data = await req.json()
  if (!data.propertyId || !data.name || !data.glAccountId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [property, glAccount] = await Promise.all([
    prisma.property.findFirst({ where: { id: data.propertyId, organizationId: session.organizationId } }),
    prisma.chartOfAccount.findFirst({ where: { id: data.glAccountId, organizationId: session.organizationId } }),
  ])
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  if (!glAccount) return NextResponse.json({ error: 'GL account not found' }, { status: 404 })

  try {
    const bankAccount = await prisma.bankAccount.create({
      data: {
        propertyId: data.propertyId,
        name: data.name,
        type: ['Operating', 'SecurityDepositTrust', 'Reserve'].includes(data.type) ? data.type : 'Operating',
        glAccountId: data.glAccountId,
      },
    })
    return NextResponse.json(bankAccount, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
