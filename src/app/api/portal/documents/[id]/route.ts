import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTenantSession } from '@/lib/tenantAuth'

// Deliberately its own route rather than reusing /api/documents/[id] — that one authorizes
// against an admin session and org-wide document ownership. A tenant may only ever download a
// document attached to one of their own leases, which is a narrower and different check.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getTenantSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id } = await params

  const doc = await prisma.document.findFirst({
    where: { id, leaseId: { not: null }, lease: { leaseTenants: { some: { tenantId: session.tenantId } } } },
  })
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(new Uint8Array(doc.content), {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`,
      'Content-Length': String(doc.size),
    },
  })
}
