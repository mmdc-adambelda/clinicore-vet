'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Calendar, Clock, User, PawPrint, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const STATUS_BADGE: Record<string,string> = {
  in_room:   'bg-teal-100 text-teal-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-slate-100 text-slate-600',
  walk_in:   'bg-amber-100 text-amber-700',
  completed: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-600',
  no_show:   'bg-red-50 text-red-400',
}
const STATUS_OPTIONS = ['scheduled','confirmed','in_room','completed','cancelled','no_show','walk_in']
const TRIAGE_COLORS: Record<string,string> = {
  emergency: 'bg-red-100 text-red-700',
  urgent:    'bg-orange-100 text-orange-700',
  semi_urgent:'bg-amber-100 text-amber-700',
  routine:   'bg-slate-100 text-slate-500',
}
const VET_PROCEDURES = [
  'Wellness Exam', 'Vaccination', 'Spay/Neuter', 'Dental Cleaning', 'Wound Treatment',
  'Blood Work', 'X-Ray', 'Ultrasound', 'Surgery', 'Grooming', 'Deworming',
  'Microchipping', 'Ear Cleaning', 'Nail Trimming', 'Emergency Consult', 'Follow-up',
]

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AppointmentsView({ initialAppointments }: { initialAppointments: any[] }) {
  const [appointments, setAppointments] = useState(initialAppointments)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [owners, setOwners] = useState<any[]>([])
  const [pets, setPets] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [selectedOwner, setSelectedOwner] = useState('')
  const [form, setForm] = useState({
    owner_id:'', pet_id:'', staff_id:'', scheduled_at:'', duration_minutes: 30,
    procedure_type:'', chief_complaint:'', triage_level:'routine', source:'phone', notes:''
  })
  const supabase = createClient()

  const loadAppointments = useCallback(async () => {
    let qb = supabase.from('appointments')
      .select('*, owner:owners(full_name, contact_number), pet:pets(name, species, breed), staff:staff_profiles(full_name, role)')
      .order('scheduled_at', { ascending: true })
    if (filterDate) {
      const start = filterDate + 'T00:00:00'
      const end = filterDate + 'T23:59:59'
      qb = qb.gte('scheduled_at', start).lte('scheduled_at', end)
    }
    if (filterStatus !== 'all') qb = qb.eq('status', filterStatus)
    const { data } = await qb
    if (data) setAppointments(data)
  }, [supabase, filterDate, filterStatus])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  useEffect(() => {
    supabase.from('owners').select('id, full_name').eq('is_active', true).then(({ data }) => { if (data) setOwners(data) })
    supabase.from('staff_profiles').select('id, full_name, role').eq('is_active', true).then(({ data }) => { if (data) setStaff(data) })
  }, [supabase])

  async function loadPets(ownerId: string) {
    const { data } = await supabase.from('pets').select('id, name, species').eq('owner_id', ownerId).eq('is_active', true)
    if (data) setPets(data)
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Status updated')
    await loadAppointments()
  }

  async function save() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('staff_profiles').select('clinic_id, id').eq('id', user!.id).single()
    const { error } = await supabase.from('appointments').insert({
      owner_id:        form.owner_id,
      pet_id:          form.pet_id,
      scheduled_at:    form.scheduled_at,
      duration_minutes: Number(form.duration_minutes),
      reason:          form.chief_complaint || form.procedure_type || null,
      procedure_type:  form.procedure_type || null,
      triage_level:    form.triage_level as any,
      notes:           form.notes || null,
      clinic_id:       profile!.clinic_id,
      created_by:      profile!.id,
      status:          'scheduled',
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Appointment scheduled')
    setShowModal(false)
    await loadAppointments()
    setLoading(false)
  }

  const filtered = appointments.filter(a => !query || a.pet?.name?.toLowerCase().includes(query.toLowerCase()) || a.owner?.full_name?.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search owner or pet..." className="pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-52" />
        </div>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 text-white text-[13px] font-semibold rounded-lg" style={{ background: '#0d9488' }}>
          <Plus size={14} /> New Appointment
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-3">
        {[['scheduled','Scheduled'],['confirmed','Confirmed'],['in_room','In Room'],['completed','Completed'],['cancelled','Cancelled']].map(([s, label]) => {
          const count = appointments.filter(a => a.status === s).length
          return <div key={s} className={cn('rounded-xl p-3 text-center border', STATUS_BADGE[s] ?? 'bg-slate-50 border-slate-100')}>
            <div className="text-[18px] font-bold">{count}</div>
            <div className="text-[10px] font-medium mt-0.5">{label}</div>
          </div>
        })}
      </div>

      {/* Appointment Cards */}
      <div className="space-y-2">
        {filtered.map(appt => (
          <div key={appt.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-teal-200 transition-colors">
            <div className="text-center w-16 flex-shrink-0">
              <div className="text-[14px] font-bold text-slate-700">{formatTime(appt.scheduled_at)}</div>
              <div className="text-[10px] text-slate-400">{appt.duration_minutes}m</div>
            </div>
            <div className="w-px h-10 bg-slate-200 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-slate-800">{appt.pet?.name}</span>
                <span className="text-[11px] text-slate-400">({appt.pet?.species}{appt.pet?.breed ? ` · ${appt.pet.breed}` : ''})</span>
                {appt.triage_level && appt.triage_level !== 'routine' && (
                  <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase', TRIAGE_COLORS[appt.triage_level])}>{appt.triage_level}</span>
                )}
              </div>
              <div className="text-[12px] text-slate-500 mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1"><User size={10} />{appt.owner?.full_name}</span>
                {appt.procedure_type && <span>{appt.procedure_type}</span>}
                {appt.chief_complaint && <span className="text-slate-400 truncate">{appt.chief_complaint}</span>}
              </div>
              {appt.staff && <div className="text-[11px] text-slate-400 mt-0.5">Dr. {appt.staff.full_name}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('text-[11px] font-semibold px-2 py-1 rounded-full', STATUS_BADGE[appt.status] ?? 'bg-slate-100 text-slate-500')}>{appt.status.replace('_',' ')}</span>
              <select value={appt.status} onChange={e => updateStatus(appt.id, e.target.value)} className="text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white focus:outline-none">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
            <Calendar size={40} className="mb-2 opacity-20" />
            <p className="text-[13px]">No appointments for this date</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100"><h2 className="text-[16px] font-bold text-slate-800">Schedule Appointment</h2></div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Owner *</label>
                <select value={selectedOwner} onChange={e => { setSelectedOwner(e.target.value); setForm(f => ({...f, owner_id: e.target.value, pet_id:''})); loadPets(e.target.value) }} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="">Select owner...</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                </select></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Pet *</label>
                <select value={form.pet_id} onChange={e => setForm(f => ({...f, pet_id: e.target.value}))} disabled={!selectedOwner} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white disabled:opacity-50">
                  <option value="">Select pet...</option>
                  {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species})</option>)}
                </select></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Veterinarian *</label>
                <select value={form.staff_id} onChange={e => setForm(f => ({...f, staff_id: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="">Select vet/staff...</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role.replace('_',' ')})</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Date & Time *</label>
                  <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({...f, scheduled_at: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Duration (min)</label>
                  <select value={form.duration_minutes} onChange={e => setForm(f => ({...f, duration_minutes: parseInt(e.target.value)}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    {[15,30,45,60,90,120].map(d => <option key={d} value={d}>{d} min</option>)}
                  </select></div>
              </div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Procedure</label>
                <input list="procedures" value={form.procedure_type} onChange={e => setForm(f => ({...f, procedure_type: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Type or select..." />
                <datalist id="procedures">{VET_PROCEDURES.map(p => <option key={p} value={p} />)}</datalist></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Chief Complaint</label>
                <input value={form.chief_complaint} onChange={e => setForm(f => ({...f, chief_complaint: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Reason for visit..." /></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Triage Level</label>
                <select value={form.triage_level} onChange={e => setForm(f => ({...f, triage_level: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="routine">Routine</option>
                  <option value="semi_urgent">Semi-Urgent</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Source</label>
                <select value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  {['phone','online','walk_in','messenger','follow_up','referral'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select></div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={loading || !form.owner_id || !form.pet_id || !form.staff_id || !form.scheduled_at} className="px-6 py-2 text-[13px] font-semibold text-white rounded-lg disabled:opacity-50" style={{ background: '#0d9488' }}>
                {loading ? 'Saving...' : 'Schedule Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
