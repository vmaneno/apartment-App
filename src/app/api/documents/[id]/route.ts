import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params

  const doc = await prisma.document.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(new Uint8Array(doc.content), {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`,
      'Content-Length': String(doc.size),
    },
  })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params

  const doc = await prisma.document.findFirst({ where: { id, organizationId: session.organizationId } })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.document.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
