import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/ui/DataTable'
import { ChartOfAccountForm } from './ChartOfAccountForm'
import { ChartOfAccountRowActions } from './ChartOfAccountRowActions'

export const dynamic = 'force-dynamic'

export default async function ChartOfAccountsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const accounts = await prisma.chartOfAccount.findMany({
    where: { organizationId: session.organizationId, active: true },
    orderBy: { glNumber: 'asc' },
  })

  return (
    <div>
      <PageHeader title="Chart of Accounts" subtitle="GL accounts used across your organization's books" />
      <div className="mb-6"><ChartOfAccountForm /></div>
      <DataTable
        columns={[
          { key: 'glNumber', label: 'GL #' },
          { key: 'glName', label: 'Name' },
          { key: 'glType', label: 'Type' },
          { key: 'actions', label: 'Actions', align: 'center' as const, render: (r: Record<string, unknown>) => (
            <ChartOfAccountRowActions account={r as unknown as Parameters<typeof ChartOfAccountRowActions>[0]['account']} />
          ) },
        ]}
        data={accounts as unknown as Record<string, unknown>[]}
        emptyMessage="No accounts yet — click Add Account to create one."
      />
    </div>
  )
}
