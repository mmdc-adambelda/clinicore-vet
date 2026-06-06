'use client'
import { useState, useEffect } from 'react'
import { Search, Bell, PawPrint, Syringe, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface TopbarAlert { id: string; type: 'vaccination' | 'inventory' | 'appointment'; message: string; severity: 'info' | 'warning' | 'critical' }

function useAlerts() {
  const [alerts, setAlerts] = useState<TopbarAlert[]>([])
  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
      if (!profile) return

      const today = new Date()
      const soon = new Date(); soon.setDate(today.getDate() + 14)
      const a: TopbarAlert[] = []

      const { data: inv } = await supabase.from('inventory')
        .select('id, name, status').eq('clinic_id', profile.clinic_id)
        .in('status', ['critical', 'out_of_stock']).limit(3)
      inv?.forEach(i => a.push({ id: i.id, type: 'inventory', message: `${i.name} is ${i.status.replace('_', ' ')}`, severity: i.status === 'out_of_stock' ? 'critical' : 'warning' }))

      const todayStr = new Date().toISOString().split('T')[0]
      const { data: vacc } = await supabase.from('vaccinations')
        .select('id, vaccine_name, pet:pets(name)')
        .eq('clinic_id', profile.clinic_id)
        .lt('next_due_date', todayStr).limit(3)
      vacc?.forEach((v: any) => a.push({ id: v.id, type: 'vaccination', message: `${(v.pet as any)?.name ?? 'Pet'}'s ${v.vaccine_name} overdue`, severity: 'warning' }))

      setAlerts(a)
    }
    load()
  }, [])
  return alerts
}

export default function Topbar({ title, breadcrumb }: { title: string; breadcrumb?: string }) {
  const router = useRouter()
  const alerts = useAlerts()
  const [query, setQuery] = useState('')
  const [showAlerts, setShowAlerts] = useState(false)
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) router.push(`/owners?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="h-[60px] flex-shrink-0 bg-white border-b border-slate-200 flex items-center px-6 gap-4">
      {/* Title */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <PawPrint size={16} className="text-teal-600" />
          <h1 className="text-[15px] font-bold text-slate-800">{title}</h1>
          {breadcrumb && <span className="text-slate-400 text-[13px]">/ {breadcrumb}</span>}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">{dateStr}</div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search owners, pets…"
          className="pl-9 pr-4 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </form>

      {/* Alerts */}
      <div className="relative">
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell size={18} />
          {alerts.length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {alerts.length}
            </span>
          )}
        </button>

        {showAlerts && alerts.length > 0 && (
          <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-[12px] font-bold text-slate-700 uppercase tracking-wide">
              Alerts ({alerts.length})
            </div>
            {alerts.map(a => (
              <div key={a.id} className={`px-4 py-3 flex items-start gap-3 border-b border-slate-50 last:border-0 ${a.severity === 'critical' ? 'bg-red-50' : 'bg-amber-50'}`}>
                {a.type === 'vaccination' ? <Syringe size={14} className="text-amber-600 mt-0.5 flex-shrink-0" /> : <AlertTriangle size={14} className={`mt-0.5 flex-shrink-0 ${a.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />}
                <span className="text-[12px] text-slate-700">{a.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
