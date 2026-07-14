import { NextResponse } from 'next/server'
import { deleteTenantSession } from '@/lib/tenantAuth'

export async function POST() {
  await deleteTenantSession()
  return NextResponse.json({ ok: true })
}
