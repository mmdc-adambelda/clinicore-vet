'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'

function formatPHP(n: number) { return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0 }) }

export default function ReportsView({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Active Pets', value: stats.active_pets ?? 0, color: 'text-teal-600' },
          { label: 'Total Owners', value: stats.active_owners ?? 0, color: 'text-blue-600' },
          { label: 'Vaccinations Due', value: stats.vaccination_due_count ?? 0, color: 'text-amber-600' },
          { label: 'Cancellation Rate', value: `${stats.cancellation_rate ?? 0}%`, color: 'text-red-500' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-5 text-center">
            <div className={`text-[28px] font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[12px] text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4">Weekly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.weekly_revenue ?? []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [formatPHP(Number(v)), 'Revenue']} />
              <Bar dataKey="amount" fill="#0d9488" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-[14px] font-bold text-slate-800 mb-4">Pet Species Distribution</h3>
          <div className="space-y-3">
            {(stats.species_breakdown ?? []).map((s: any, i: number) => {
              const total = (stats.species_breakdown ?? []).reduce((sum: number, x: any) => sum + x.count, 0)
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
              const colors = ['#0d9488','#0891b2','#7c3aed','#db2777','#d97706','#65a30d']
              return (
                <div key={s.species}>
                  <div className="flex justify-between text-[12px] mb-1"><span className="font-medium text-slate-700 capitalize">{s.species}</span><span className="text-slate-500">{s.count} ({pct}%)</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-[14px] font-bold text-slate-800 mb-2">Key Performance Indicators</h3>
        <p className="text-[12px] text-slate-400 mb-5">Summary of clinic performance metrics</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Today's Revenue", value: formatPHP(stats.today_revenue ?? 0) },
            { label: "Today's Appointments", value: stats.today_appointments ?? 0 },
            { label: "Outstanding Balance", value: formatPHP(stats.pending_balance ?? 0) },
            { label: "New Pets This Month", value: stats.new_pets_month ?? 0 },
          ].map(kpi => (
            <div key={kpi.label} className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-[22px] font-bold text-slate-700">{kpi.value}</div>
              <div className="text-[11px] text-slate-500 mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
