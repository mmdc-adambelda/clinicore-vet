'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { useRouter } from 'next/navigation'
import {
  Users, Calendar, DollarSign, AlertTriangle,
  Syringe, PawPrint, Heart, Package, TrendingUp, TrendingDown, Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  in_room:   'bg-teal-100 text-teal-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-slate-100 text-slate-600',
  walk_in:   'bg-amber-100 text-amber-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  in_room:   '🩺 In Room',
  confirmed: '✓ Confirmed',
  scheduled: '📅 Scheduled',
  walk_in:   '🚶 Walk-in',
  completed: '✅ Done',
  cancelled: '✗ Cancelled',
}
const SPECIES_COLORS = ['#0d9488','#0891b2','#7c3aed','#db2777','#d97706','#65a30d']

function formatPHP(n: number) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function DashboardView({ stats }: { stats: any }) {
  const router = useRouter()

  const kpiCards = [
    {
      icon: Calendar, label: "Today's Appointments",
      value: stats.today_appointments,
      sub: stats.today_appointments === 0 ? 'None scheduled today' : `${stats.today_appointments} patient${stats.today_appointments !== 1 ? 's' : ''} today`,
      trend: stats.today_appointments > 0 ? 'up' : 'neutral',
      color: 'bg-teal-50', iconColor: 'text-teal-600', border: 'border-teal-100',
    },
    {
      icon: PawPrint, label: 'Active Pets',
      value: stats.active_pets?.toLocaleString() ?? '0',
      sub: `+${stats.new_pets_month ?? 0} new this month`,
      trend: 'up', color: 'bg-emerald-50', iconColor: 'text-emerald-600', border: 'border-emerald-100',
    },
    {
      icon: DollarSign, label: "Today's Revenue",
      value: formatPHP(stats.today_revenue ?? 0),
      sub: stats.today_revenue === 0 ? 'No payments yet today' : 'Collected today',
      trend: stats.today_revenue > 0 ? 'up' : 'neutral',
      color: 'bg-amber-50', iconColor: 'text-amber-600', border: 'border-amber-100',
    },
    {
      icon: AlertTriangle, label: 'Outstanding Balance',
      value: formatPHP(stats.pending_balance ?? 0),
      sub: stats.pending_balance === 0 ? 'All settled ✓' : 'Unpaid invoices',
      trend: stats.pending_balance > 0 ? 'dn' : 'up',
      color: 'bg-red-50', iconColor: 'text-red-500', border: 'border-red-100',
    },
    {
      icon: Syringe, label: 'Vaccinations Due',
      value: stats.vaccination_due_count ?? 0,
      sub: stats.vaccination_due_count > 0 ? 'Pets need attention' : 'All up to date ✓',
      trend: stats.vaccination_due_count > 0 ? 'dn' : 'up',
      color: 'bg-purple-50', iconColor: 'text-purple-600', border: 'border-purple-100',
    },
    {
      icon: Users, label: 'Active Owners',
      value: stats.active_owners?.toLocaleString() ?? '0',
      sub: `${stats.active_pets ?? 0} total registered pets`,
      trend: 'up', color: 'bg-blue-50', iconColor: 'text-blue-600', border: 'border-blue-100',
    },
  ]

  const weeklyData = stats.weekly_revenue ?? []
  const speciesData = (stats.species_breakdown ?? []).map((s: any, i: number) => ({ ...s, fill: SPECIES_COLORS[i % SPECIES_COLORS.length] }))

  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map(({ icon: Icon, label, value, sub, trend, color, iconColor, border }) => (
          <div key={label} className={cn('rounded-xl border p-4', color, border)}>
            <div className="flex items-center justify-between mb-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-sm', iconColor)}>
                <Icon size={16} />
              </div>
              {trend === 'up' && <TrendingUp size={14} className="text-emerald-500" />}
              {trend === 'dn' && <TrendingDown size={14} className="text-red-400" />}
            </div>
            <div className="text-[20px] font-bold text-slate-800 leading-none">{value}</div>
            <div className="text-[11px] font-semibold text-slate-600 mt-1">{label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Weekly Revenue */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800">Weekly Revenue</h3>
              <p className="text-[11px] text-slate-400">Last 7 days collections</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`₱${Number(v).toLocaleString()}`, 'Revenue']} labelStyle={{ fontSize: 12 }} />
              <Bar dataKey="amount" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Species Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-[14px] font-bold text-slate-800 mb-1">Pet Species</h3>
          <p className="text-[11px] text-slate-400 mb-4">Active pets by species</p>
          {speciesData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={speciesData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="count" paddingAngle={3}>
                    {speciesData.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any, p: any) => [v, p.payload.species]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {speciesData.map((s: any) => (
                  <div key={s.species} className="flex items-center gap-2 text-[12px]">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.fill }} />
                    <span className="flex-1 text-slate-600 capitalize">{s.species}</span>
                    <span className="font-semibold text-slate-700">{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-[12px]">No data yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's Schedule */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800">Today's Schedule</h3>
              <p className="text-[11px] text-slate-400">All appointments for today</p>
            </div>
            <button onClick={() => router.push('/appointments')} className="text-[12px] text-teal-600 hover:text-teal-700 font-medium">View all →</button>
          </div>
          {stats.today_schedule?.length > 0 ? (
            <div className="space-y-2">
              {stats.today_schedule.slice(0, 6).map((appt: any) => (
                <div key={appt.id} onClick={() => router.push('/appointments')} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                  <div className="text-[11px] font-mono text-slate-500 w-16 flex-shrink-0">{formatTime(appt.scheduled_at)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-800 truncate">{appt.pet?.name ?? appt.owner?.full_name ?? '—'}</div>
                    <div className="text-[11px] text-slate-400 truncate">{appt.procedure_type || appt.chief_complaint || 'General consult'}</div>
                  </div>
                  <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full', STATUS_BADGE[appt.status] ?? 'bg-slate-100 text-slate-500')}>
                    {STATUS_LABEL[appt.status] ?? appt.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Calendar size={32} className="mb-2 opacity-30" />
              <p className="text-[13px]">No appointments today</p>
            </div>
          )}
        </div>

        {/* Alerts Panel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[14px] font-bold text-slate-800">Clinic Alerts</h3>
              <p className="text-[11px] text-slate-400">Items needing attention</p>
            </div>
          </div>
          <div className="space-y-3">

            {/* Vaccinations Due */}
            {stats.vaccination_due_count > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <Syringe size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[13px] font-semibold text-amber-800">Vaccinations Due Soon</div>
                  <div className="text-[11px] text-amber-600">{stats.vaccination_due_count} pet{stats.vaccination_due_count !== 1 ? 's' : ''} need vaccination reminder</div>
                </div>
                <button onClick={() => router.push('/vaccinations')} className="ml-auto text-[11px] text-amber-700 font-semibold hover:underline">View</button>
              </div>
            )}

            {/* Inventory alerts */}
            {stats.inventory_alerts?.length > 0 && stats.inventory_alerts.map((item: any) => (
              <div key={item.id} className={cn('flex items-start gap-3 p-3 rounded-lg border', item.status === 'out_of_stock' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100')}>
                <Package size={16} className={cn('mt-0.5 flex-shrink-0', item.status === 'out_of_stock' ? 'text-red-500' : 'text-orange-500')} />
                <div>
                  <div className={cn('text-[13px] font-semibold', item.status === 'out_of_stock' ? 'text-red-800' : 'text-orange-800')}>{item.name}</div>
                  <div className={cn('text-[11px]', item.status === 'out_of_stock' ? 'text-red-600' : 'text-orange-600')}>{item.status === 'out_of_stock' ? '❌ Out of stock' : `⚠️ Low stock — ${item.stock_quantity} ${item.unit} left`}</div>
                </div>
                <button onClick={() => router.push('/inventory')} className="ml-auto text-[11px] font-semibold hover:underline" style={{ color: item.status === 'out_of_stock' ? '#dc2626' : '#ea580c' }}>Reorder</button>
              </div>
            ))}

            {(!stats.vaccination_due_count && (!stats.inventory_alerts || stats.inventory_alerts.length === 0)) && (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Heart size={32} className="mb-2 opacity-30 text-teal-500" />
                <p className="text-[13px]">All clear! No alerts today.</p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-[16px] font-bold text-slate-700">{(stats.cancellation_rate ?? 0).toFixed(0)}%</div>
              <div className="text-[10px] text-slate-400">Cancel Rate</div>
            </div>
            <div className="text-center">
              <div className="text-[16px] font-bold text-slate-700">{stats.new_pets_month ?? 0}</div>
              <div className="text-[10px] text-slate-400">New Pets/Mo</div>
            </div>
            <div className="text-center">
              <div className="text-[16px] font-bold text-slate-700">{stats.active_owners ?? 0}</div>
              <div className="text-[10px] text-slate-400">Owners</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
