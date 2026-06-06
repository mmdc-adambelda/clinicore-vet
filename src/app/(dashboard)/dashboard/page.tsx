import { getDashboardStats } from '@/lib/db'
import DashboardView from '@/components/dashboard/DashboardView'

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  return <DashboardView stats={stats} />
}
