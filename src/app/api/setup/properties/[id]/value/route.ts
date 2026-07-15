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

  let propertyValue: number | null = null
  if (data.propertyValue !== undefined && data.propertyValue !== null && data.propertyValue !== '') {
    propertyValue = parseFloat(data.propertyValue)
    if (isNaN(propertyValue) || propertyValue < 0) {
      return NextResponse.json({ error: 'Property value must be a positive number' }, { status: 400 })
    }
  }

  const property = await prisma.property.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  const updated = await prisma.property.update({ where: { id }, data: { propertyValue } })
  return NextResponse.json(updated)
}
