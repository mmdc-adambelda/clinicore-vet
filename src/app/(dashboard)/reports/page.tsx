import { getCurrentStaff, getDashboardStats } from '@/lib/db'
import { redirect } from 'next/navigation'
import ReportsView from '@/components/reports/ReportsView'

export default async function ReportsPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  const stats = await getDashboardStats()
  return <ReportsView stats={stats} />
}
