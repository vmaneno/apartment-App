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
  if (!data.description || !data.status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await prisma.workOrder.findFirst({ where: { id, property: { organizationId: session.organizationId } } })
  if (!existing) return NextResponse.json({ error: 'Work order not found' }, { status: 404 })

  const status = ['Open', 'Assigned', 'InProgress', 'Completed'].includes(data.status) ? data.status : 'Open'
  const wasCompleted = existing.status === 'Completed'
  const isNowCompleted = status === 'Completed'

  try {
    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        description: data.description,
        priority: data.priority === 'Emergency' ? 'Emergency' : 'Routine',
        status,
        assignedVendorId: data.assignedVendorId || null,
        completedAt: isNowCompleted ? (existing.completedAt ?? new Date()) : (wasCompleted && !isNowCompleted ? null : existing.completedAt),
      },
    })
    return NextResponse.json(workOrder)
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
  const existing = await prisma.workOrder.findFirst({ where: { id, property: { organizationId: session.organizationId } } })
  if (!existing) return NextResponse.json({ error: 'Work order not found' }, { status: 404 })

  await prisma.workOrder.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
