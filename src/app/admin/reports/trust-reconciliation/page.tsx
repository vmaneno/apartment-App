import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { formatCurrency } from '@/lib/utils'
import { TrustReconciliationFilters } from './TrustReconciliationFilters'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ propertyId?: string; asOfDate?: string }>

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default async function TrustReconciliationPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { propertyId, asOfDate } = await searchParams
  const asOf = asOfDate || today()
  const asOfEnd = new Date(`${asOf}T23:59:59Z`)

  const [properties, trustAccounts] = await Promise.all([
    prisma.property.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.bankAccount.findMany({
      where: {
        type: 'SecurityDepositTrust',
        active: true,
        property: {
          organizationId: session.organizationId,
          active: true,
          ...(propertyId ? { id: propertyId } : {}),
        },
      },
      include: { property: true, glAccount: true },
      orderBy: [{ property: { name: 'asc' } }, { name: 'asc' }],
    }),
  ])

  const glIds = trustAccounts.map(a => a.glAccountId)
  const lines = glIds.length > 0
    ? await prisma.transactionLine.findMany({
        where: { glAccountId: { in: glIds }, transaction: { date: { lte: asOfEnd } } },
      })
    : []
  const balanceByGl = new Map<string, number>()
  for (const l of lines) {
    balanceByGl.set(l.glAccountId, (balanceByGl.get(l.glAccountId) ?? 0) + (l.debit - l.credit))
  }

  const rows = await Promise.all(trustAccounts.map(async acct => {
    const deposits = await prisma.securityDeposit.findMany({
      where: { bankAccountId: acct.id, collectedDate: { lte: asOfEnd } },
    })
    let openLiability = 0
    let retainedNotSwept = 0
    for (const d of deposits) {
      const stillOpen = !d.returnedDate || d.returnedDate > asOfEnd
      if (stillOpen) openLiability += d.amount
      else retainedNotSwept += d.retained ?? 0
    }
    openLiability = Math.round(openLiability * 100) / 100
    retainedNotSwept = Math.round(retainedNotSwept * 100) / 100
    const cashBalance = Math.round((balanceByGl.get(acct.glAccountId) ?? 0) * 100) / 100
    const expectedBalance = Math.round((openLiability + retainedNotSwept) * 100) / 100
    const difference = Math.round((cashBalance - expectedBalance) * 100) / 100

    return {
      id: acct.id,
      propertyName: acct.property.name,
      accountName: acct.name,
      glLabel: `${acct.glAccount.glNumber} ${acct.glAccount.glName}`,
      cashBalance,
      openLiability,
      retainedNotSwept,
      expectedBalance,
      difference,
    }
  }))

  const totalCash = Math.round(rows.reduce((s, r) => s + r.cashBalance, 0) * 100) / 100
  const totalLiability = Math.round(rows.reduce((s, r) => s + r.openLiability, 0) * 100) / 100
  const totalRetained = Math.round(rows.reduce((s, r) => s + r.retainedNotSwept, 0) * 100) / 100
  const totalDifference = Math.round(rows.reduce((s, r) => s + r.difference, 0) * 100) / 100
  const allReconciled = rows.every(r => Math.abs(r.difference) < 0.005)

  const cards = [
    { label: 'Trust Cash (books)', value: formatCurrency(totalCash) },
    { label: 'Open Deposit Liability', value: formatCurrency(totalLiability) },
    { label: 'Retained, Not Yet Swept', value: formatCurrency(totalRetained) },
    { label: 'Difference', value: formatCurrency(totalDifference), color: Math.abs(totalDifference) < 0.005 ? '#10a06a' : '#ef4444' },
  ]

  return (
    <div>
      <PageHeader title="Trust Account Reconciliation" subtitle="Proves trust cash on the books equals what's actually owed back to tenants" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-lg font-bold mt-1" style={{ color: c.color ?? 'var(--text-primary)' }}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mb-2">
        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: allReconciled ? '#10a06a22' : '#ef444422', color: allReconciled ? '#10a06a' : '#ef4444' }}>
          {allReconciled ? 'All trust accounts reconciled' : 'Discrepancy found — see Difference column below'}
        </span>
      </div>
      <div className="mb-4"><TrustReconciliationFilters properties={properties} propertyId={propertyId ?? ''} asOfDate={asOf} /></div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        Expected Balance = Open Deposit Liability (money still owed back to a current tenant) + Retained, Not
        Yet Swept (the landlord-kept portion of a already-returned deposit — recognized as income when the
        deposit was returned, but this app has no bank-to-bank transfer mechanic, so that cash is still
        physically sitting in the trust account until it's manually moved to Operating). Difference = Trust
        Cash (books) − Expected Balance; it should be $0.00 for every account below.
      </p>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property' },
          { key: 'accountName', label: 'Trust Account' },
          { key: 'glLabel', label: 'GL Account' },
          { key: 'cashBalance', label: 'Cash (books)', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.cashBalance as number) },
          { key: 'openLiability', label: 'Open Liability', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.openLiability as number) },
          { key: 'retainedNotSwept', label: 'Retained, Not Swept', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.retainedNotSwept as number) },
          { key: 'expectedBalance', label: 'Expected Balance', align: 'right' as const, render: (r: Record<string, unknown>) => formatCurrency(r.expectedBalance as number) },
          { key: 'difference', label: 'Difference', align: 'right' as const, render: (r: Record<string, unknown>) => {
            const d = r.difference as number
            const ok = Math.abs(d) < 0.005
            return <span className="font-semibold" style={{ color: ok ? '#10a06a' : '#ef4444' }}>{formatCurrency(d)}</span>
          } },
        ]}
        data={rows as unknown as Record<string, unknown>[]}
        emptyMessage="No security-deposit trust bank accounts set up yet — add one under Bank Accounts with type Security Deposit Trust."
      />
    </div>
  )
}
