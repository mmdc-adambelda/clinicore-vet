import { getCurrentStaff, getDashboardStats } from '@/lib/db'
import { redirect } from 'next/navigation'
import DashboardView from '@/components/dashboard/DashboardView'

export default async function DashboardPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  const stats = await getDashboardStats()
  return <DashboardView stats={stats} />
}
