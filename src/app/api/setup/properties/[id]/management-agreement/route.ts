import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const data = await req.json()
  const feePercent = parseFloat(data.feePercent)
  if (isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
    return NextResponse.json({ error: 'Management fee must be between 0 and 100' }, { status: 400 })
  }

  const property = await prisma.property.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  try {
    const agreement = await prisma.managementAgreement.upsert({
      where: { propertyId: id },
      update: { feePercent },
      create: { propertyId: id, feePercent },
    })
    return NextResponse.json(agreement)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
