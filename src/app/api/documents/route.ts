import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

const MAX_SIZE = 8 * 1024 * 1024 // 8MB — Postgres row storage, not built for large files
const CATEGORIES = ['Lease', 'W9', 'COI', 'Inspection', 'ID', 'Other']

// Single source of truth for every optional Document link — each entry both accepts the form
// field and validates the linked record belongs to the caller's org. A field that's missing
// from this map is a field that silently never gets set (see PROGRESS.md's inspectionId bug),
// so this is the only place a new link type needs to be added.
const LINK_LOOKUPS: Record<string, (id: string, orgId: string) => Promise<unknown>> = {
  propertyId: (id, orgId) => prisma.property.findFirst({ where: { id, organizationId: orgId } }),
  unitId: (id, orgId) => prisma.unit.findFirst({ where: { id, property: { organizationId: orgId } } }),
  leaseId: (id, orgId) => prisma.lease.findFirst({ where: { id, unit: { property: { organizationId: orgId } } } }),
  tenantId: (id, orgId) => prisma.tenant.findFirst({ where: { id, organizationId: orgId } }),
  vendorId: (id, orgId) => prisma.vendor.findFirst({ where: { id, organizationId: orgId } }),
  inspectionId: (id, orgId) => prisma.inspection.findFirst({ where: { id, organizationId: orgId } }),
  applicantId: (id, orgId) => prisma.applicant.findFirst({ where: { id, organizationId: orgId } }),
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file')
  const category = form.get('category')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (typeof category !== 'string' || !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds the 8MB limit' }, { status: 400 })
  }

  const links: Record<string, string> = {}
  for (const field of Object.keys(LINK_LOOKUPS)) {
    const v = form.get(field)
    if (typeof v === 'string' && v) links[field] = v
  }

  const orgId = session.organizationId
  const linkEntries = Object.entries(links)
  const found = await Promise.all(linkEntries.map(([field, id]) => LINK_LOOKUPS[field](id, orgId)))
  if (found.some(f => !f)) {
    return NextResponse.json({ error: 'Linked record not found' }, { status: 404 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const doc = await prisma.document.create({
      data: {
        organizationId: session.organizationId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        content: buffer,
        category,
        ...links,
      },
      select: { id: true, fileName: true, category: true, size: true, uploadedAt: true },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
