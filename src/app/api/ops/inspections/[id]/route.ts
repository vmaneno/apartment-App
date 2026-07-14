import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

const STATUSES = ['Scheduled', 'Completed', 'Cancelled']
const TYPES = ['Move-In', 'Move-Out', 'Routine', 'Turn']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const data = await req.json()
  if (!data.scheduledDate || !data.status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await prisma.inspection.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })

  const status = STATUSES.includes(data.status) ? data.status : 'Scheduled'
  const wasCompleted = existing.status === 'Completed'
  const isNowCompleted = status === 'Completed'

  try {
    const inspection = await prisma.inspection.update({
      where: { id },
      data: {
        type: TYPES.includes(data.type) ? data.type : existing.type,
        status,
        scheduledDate: new Date(data.scheduledDate),
        inspectorName: data.inspectorName || null,
        notes: data.notes || null,
        completedDate: isNowCompleted ? (existing.completedDate ?? new Date()) : (wasCompleted && !isNowCompleted ? null : existing.completedDate),
      },
    })
    return NextResponse.json(inspection)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.inspection.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })

  await prisma.inspection.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
