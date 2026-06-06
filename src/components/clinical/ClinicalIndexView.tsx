'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Stethoscope, PawPrint, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_BADGE: Record<string,string> = {
  booking:       'bg-slate-100 text-slate-500',
  triage:        'bg-red-100 text-red-700',
  consultation:  'bg-blue-100 text-blue-700',
  diagnosis:     'bg-purple-100 text-purple-700',
  treatment_plan:'bg-amber-100 text-amber-700',
  procedure:     'bg-orange-100 text-orange-700',
  billing:       'bg-teal-100 text-teal-700',
  follow_up:     'bg-emerald-100 text-emerald-700',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function ClinicalIndexView({ visits }: { visits: any[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? visits : filter === 'active' ? visits.filter(v => v.status !== 'completed') : visits.filter(v => v.status === 'completed')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {['all','active','completed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-4 py-2 text-[12px] font-semibold rounded-lg capitalize transition-colors', filter === f ? 'text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')} style={filter === f ? { background: '#0d9488' } : {}}>
            {f === 'all' ? `All (${visits.length})` : f === 'active' ? `Active (${visits.filter(v => v.status !== 'completed').length})` : `Completed (${visits.filter(v => v.status === 'completed').length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(visit => (
          <div key={visit.id} onClick={() => router.push(`/clinical/${visit.id}`)}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 cursor-pointer hover:border-teal-200 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-xl flex-shrink-0">
              {visit.pet?.species === 'Dog' ? '🐕' : visit.pet?.species === 'Cat' ? '🐈' : '🐾'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-slate-800">{visit.pet?.name}</span>
                <span className="text-[11px] text-slate-400">— {visit.owner?.full_name}</span>
              </div>
              <div className="text-[12px] text-slate-500 mt-0.5">{visit.chief_complaint || 'No chief complaint recorded'}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Dr. {visit.staff?.full_name} · {formatTime(visit.created_at)}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', STATUS_BADGE[visit.workflow_step] ?? 'bg-slate-100 text-slate-500')}>
                {visit.workflow_step?.replace('_', ' ')}
              </span>
              {visit.status === 'completed' ? <CheckCircle size={16} className="text-emerald-500" /> : <Clock size={16} className="text-amber-500" />}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
            <Stethoscope size={40} className="mb-2 opacity-20" />
            <p className="text-[13px]">No clinical visits found</p>
          </div>
        )}
      </div>
    </div>
  )
}
