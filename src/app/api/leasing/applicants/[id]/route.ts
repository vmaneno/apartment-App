import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

const STATUSES = ['Applied', 'Screening', 'Approved', 'Denied', 'Withdrawn']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id } = await params
  const data = await req.json()
  if (!data.name || !data.status) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const existing = await prisma.applicant.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })

  const status = STATUSES.includes(data.status) ? data.status : 'Applied'

  try {
    const applicant = await prisma.applicant.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        status,
        notes: data.notes || null,
      },
    })
    return NextResponse.json(applicant)
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
  const existing = await prisma.applicant.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!existing) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })

  await prisma.applicant.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
