import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { ReconcileTable } from './ReconcileTable'

export const dynamic = 'force-dynamic'

export default async function ReconcilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id, property: { organizationId: session.organizationId } },
    include: { property: true, glAccount: true },
  })
  if (!bankAccount) notFound()

  const lines = await prisma.transactionLine.findMany({
    where: { glAccountId: bankAccount.glAccountId, propertyId: bankAccount.propertyId },
    include: { transaction: true },
    orderBy: { transaction: { date: 'asc' } },
  })

  const rows = lines.map(l => ({
    id: l.id,
    date: l.transaction.date,
    description: l.description ?? l.transaction.description,
    debit: l.debit,
    credit: l.credit,
    cleared: l.cleared,
  }))

  return (
    <div>
      <Link href="/admin/setup/bank-accounts" className="text-xs underline mb-2 inline-block" style={{ color: 'var(--text-muted)' }}>
        ← Bank Accounts
      </Link>
      <PageHeader
        title={`Reconcile — ${bankAccount.name}`}
        subtitle={`${bankAccount.property.name} · GL ${bankAccount.glAccount.glNumber} ${bankAccount.glAccount.glName}`}
      />
      <ReconcileTable lines={rows as unknown as Parameters<typeof ReconcileTable>[0]['lines']} />
    </div>
  )
}
