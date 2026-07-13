import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { BankAccountForm } from './BankAccountForm'
import { BankAccountRowActions } from './BankAccountRowActions'

export const dynamic = 'force-dynamic'

export default async function BankAccountsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [bankAccounts, properties, glAccounts] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { property: { organizationId: session.organizationId, active: true }, active: true },
      include: { property: true, glAccount: true },
      orderBy: [{ property: { name: 'asc' } }, { name: 'asc' }],
    }),
    prisma.property.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.chartOfAccount.findMany({
      where: { organizationId: session.organizationId, active: true, glType: 'Asset' },
      orderBy: { glNumber: 'asc' },
      select: { id: true, glNumber: true, glName: true },
    }),
  ])

  return (
    <div>
      <PageHeader title="Bank Accounts" subtitle="Bank accounts per property, each linked to a GL account" />
      <div className="mb-6"><BankAccountForm properties={properties} glAccounts={glAccounts} /></div>
      <DataTable
        columns={[
          { key: 'propertyName', label: 'Property', render: (r: Record<string, unknown>) => (r.property as { name: string }).name },
          { key: 'name', label: 'Account Name' },
          { key: 'type', label: 'Type' },
          { key: 'glAccount', label: 'GL Account', render: (r: Record<string, unknown>) => {
            const gl = r.glAccount as { glNumber: string; glName: string }
            return `${gl.glNumber} – ${gl.glName}`
          } },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <BankAccountRowActions
              bankAccount={r as unknown as Parameters<typeof BankAccountRowActions>[0]['bankAccount']}
              glAccounts={glAccounts}
            />
          ) },
        ]}
        data={bankAccounts as unknown as Record<string, unknown>[]}
        emptyMessage="No bank accounts yet — click Add Bank Account to create one."
      />
    </div>
  )
}
