'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Syringe, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const VACCINES = [
  '5-in-1 (DHPP)','Rabies','Bordetella','Leptospirosis','Lyme Disease',
  'Feline FVRCP','Feline Rabies','Feline FeLV','Kennel Cough','Distemper',
  'Parvovirus','Hepatitis (CAV-2)','Parainfluenza','Corona Virus',
]

// Compute vaccination status from most recent vaccination next_due_date
function getVaccStatus(pet: any): 'up_to_date' | 'due_soon' | 'overdue' | 'never' {
  const vaccs: any[] = pet.vaccinations || []
  if (!vaccs.length) return 'never'
  const today = new Date()
  const soon = new Date(); soon.setDate(today.getDate() + 14)
  // Find the most imminent due date
  const dueDates = vaccs
    .filter(v => v.next_due_date)
    .map(v => new Date(v.next_due_date))
  if (!dueDates.length) return 'up_to_date'
  const earliest = new Date(Math.min(...dueDates.map(d => d.getTime())))
  if (earliest < today) return 'overdue'
  if (earliest <= soon) return 'due_soon'
  return 'up_to_date'
}

function getLastVaccinationDate(pet: any): string | null {
  const vaccs: any[] = pet.vaccinations || []
  if (!vaccs.length) return null
  const dates = vaccs.map(v => v.date_given).filter(Boolean).sort().reverse()
  return dates[0] || null
}

function getNextDueDate(pet: any): string | null {
  const vaccs: any[] = pet.vaccinations || []
  const dueDates = vaccs.filter(v => v.next_due_date).map(v => v.next_due_date).sort()
  return dueDates[0] || null
}

const STATUS_BADGE: Record<string, string> = {
  up_to_date: 'bg-emerald-100 text-emerald-700',
  due_soon:   'bg-amber-100 text-amber-700',
  overdue:    'bg-red-100 text-red-700',
  never:      'bg-slate-100 text-slate-500',
}

export default function VaccinationsView({ initialPets }: { initialPets: any[] }) {
  const [pets, setPets] = useState(initialPets)
  const [query, setQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    vaccine_name: '',
    date_given: new Date().toISOString().split('T')[0],
    next_due_date: '',
    batch_number: '',
    manufacturer: '',
    notes: '',
  })
  const supabase = createClient()

  const loadPets = useCallback(async () => {
    let qb = supabase.from('pets')
      .select('*, owner:owners(full_name, contact_number), vaccinations(*)')
      .eq('is_active', true)
      .order('name', { ascending: true })
    if (query) qb = qb.ilike('name', `%${query}%`)
    const { data } = await qb
    if (data) {
      let results = data as any[]
      // Client-side filter by computed status
      if (filterStatus !== 'all') {
        results = results.filter(p => getVaccStatus(p) === filterStatus)
      }
      setPets(results)
    }
  }, [supabase, query, filterStatus])

  useEffect(() => { const t = setTimeout(loadPets, 300); return () => clearTimeout(t) }, [loadPets])

  async function saveVaccination() {
    if (!form.vaccine_name) { toast.error('Select a vaccine'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('staff_profiles')
      .select('clinic_id, id').eq('id', user!.id).single()
    const { error } = await supabase.from('vaccinations').insert({
      vaccine_name:   form.vaccine_name,
      date_given:     form.date_given,
      next_due_date:  form.next_due_date || null,
      batch_number:   form.batch_number || null,
      manufacturer:   form.manufacturer || null,
      notes:          form.notes || null,
      pet_id:         selectedPet.id,
      clinic_id:      profile!.clinic_id,
      administered_by: profile!.id,
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Vaccination recorded')
    setShowModal(false)
    await loadPets()
    setLoading(false)
  }

  const overdueCount  = pets.filter(p => getVaccStatus(p) === 'overdue').length
  const dueSoonCount  = pets.filter(p => getVaccStatus(p) === 'due_soon').length
  const upToDateCount = pets.filter(p => getVaccStatus(p) === 'up_to_date').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-emerald-600" />
          <div>
            <div className="text-[18px] font-bold text-emerald-700">{upToDateCount}</div>
            <div className="text-[11px] text-emerald-600">Up to date</div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
          <Clock size={20} className="text-amber-600" />
          <div>
            <div className="text-[18px] font-bold text-amber-700">{dueSoonCount}</div>
            <div className="text-[11px] text-amber-600">Due within 14 days</div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-600" />
          <div>
            <div className="text-[18px] font-bold text-red-700">{overdueCount}</div>
            <div className="text-[11px] text-red-600">Overdue</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search pets..."
            className="w-full pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
          <option value="all">All Status</option>
          <option value="up_to_date">Up to date</option>
          <option value="due_soon">Due soon</option>
          <option value="overdue">Overdue</option>
          <option value="never">Never vaccinated</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Pet','Owner','Species','Last Vaccination','Next Due','Status','Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pets.map(pet => {
              const status      = getVaccStatus(pet)
              const lastDate    = getLastVaccinationDate(pet)
              const nextDueDate = getNextDueDate(pet)
              return (
                <tr key={pet.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-semibold text-slate-800">{pet.name}</div>
                    <div className="text-[11px] text-slate-400">{pet.breed || pet.species}</div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">
                    {pet.owner?.full_name}<br/>
                    <span className="text-slate-400">{pet.owner?.contact_number}</span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-600 capitalize">{pet.species}</td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">
                    {lastDate ? new Date(lastDate).toLocaleDateString('en-PH') : '—'}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">
                    {nextDueDate ? new Date(nextDueDate).toLocaleDateString('en-PH') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full', STATUS_BADGE[status])}>
                      {status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => {
                      setSelectedPet(pet)
                      setForm({ vaccine_name:'', date_given: new Date().toISOString().split('T')[0], next_due_date:'', batch_number:'', manufacturer:'', notes:'' })
                      setShowModal(true)
                    }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700">
                      <Syringe size={12} /> Record
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {pets.length === 0 && <div className="py-16 text-center text-slate-400 text-[13px]">No pets found</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-[16px] font-bold text-slate-800">Record Vaccination</h2>
              <p className="text-[12px] text-slate-400 mt-1">For {selectedPet?.name} ({selectedPet?.species})</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vaccine *</label>
                <input list="vaccine-list" value={form.vaccine_name}
                  onChange={e => setForm(f => ({...f, vaccine_name: e.target.value}))}
                  placeholder="Select or type vaccine name…"
                  className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                <datalist id="vaccine-list">
                  {VACCINES.map(v => <option key={v} value={v}/>)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date Administered *</label>
                  <input type="date" value={form.date_given}
                    onChange={e => setForm(f => ({...f, date_given: e.target.value}))}
                    className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Next Due Date</label>
                  <input type="date" value={form.next_due_date}
                    onChange={e => setForm(f => ({...f, next_due_date: e.target.value}))}
                    className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Batch Number</label>
                  <input value={form.batch_number}
                    onChange={e => setForm(f => ({...f, batch_number: e.target.value}))}
                    className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Manufacturer</label>
                  <input value={form.manufacturer}
                    onChange={e => setForm(f => ({...f, manufacturer: e.target.value}))}
                    className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"/>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" rows={2}/>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-[13px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={saveVaccination} disabled={loading || !form.vaccine_name || !form.date_given}
                className="px-6 py-2 text-[13px] font-semibold text-white rounded-lg disabled:opacity-50 bg-teal-600 hover:bg-teal-700">
                {loading ? 'Saving...' : 'Record Vaccination'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
