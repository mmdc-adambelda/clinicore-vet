import { getCurrentStaff } from '@/lib/db'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { headers } from 'next/headers'

const PAGE_TITLES: Record<string, { title: string; breadcrumb?: string }> = {
  '/dashboard':     { title: 'Dashboard' },
  '/appointments':  { title: 'Appointments' },
  '/owners':        { title: 'Owners & Pets' },
  '/clinical':      { title: 'Clinical Workflow' },
  '/vaccinations':  { title: 'Vaccination Records' },
  '/prescriptions': { title: 'Prescriptions' },
  '/lab':           { title: 'Lab & Diagnostics' },
  '/billing':       { title: 'Billing & Invoices' },
  '/inventory':     { title: 'Inventory' },
  '/reports':       { title: 'Reports & KPIs' },
  '/settings':      { title: 'Settings & RBAC' },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  const headersList = headers()
  const pathname = headersList.get('x-pathname') || '/dashboard'
  const pageInfo = PAGE_TITLES[pathname] || { title: 'ClinicCore Vet' }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar staff={staff} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={pageInfo.title} breadcrumb={pageInfo.breadcrumb} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
