'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, ClipboardList, Printer, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const COMMON_MEDS = ['Amoxicillin','Doxycycline','Metronidazole','Prednisolone','Meloxicam','Omeprazole','Furosemide','Enalapril','Phenobarbital','Ivermectin','Fenbendazole','Praziquantel','Cephalexin','Enrofloxacin','Tramadol']
const FREQUENCY_OPTIONS = ['Once daily','Twice daily','Three times daily','Every 8 hours','Every 12 hours','As needed','Weekly','Monthly']

export default function PrescriptionsView({ initialPrescriptions }: { initialPrescriptions: any[] }) {
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions)
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pets, setPets] = useState<any[]>([])
  const [form, setForm] = useState({ pet_id:'', medication_name:'', dosage:'', frequency:'Once daily', duration:'7 days', instructions:'', prescribed_at: new Date().toISOString().split('T')[0] })
  const supabase = createClient()

  const loadData = useCallback(async (q = '') => {
    let qb = supabase.from('prescriptions').select('*, pet:pets(name, species, breed, owner:owners(full_name))').order('created_at', { ascending: false }).limit(50)
    if (q) qb = qb.ilike('medication_name', `%${q}%`)
    const { data } = await qb
    if (data) setPrescriptions(data)
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => loadData(query), 300)
    return () => clearTimeout(t)
  }, [query, loadData])

  useEffect(() => {
    supabase.from('pets').select('id, name, species, owner:owners(full_name)').eq('is_active', true).then(({ data }) => { if (data) setPets(data) })
  }, [supabase])

  async function save() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('staff_profiles').select('clinic_id, id').eq('id', user!.id).single()
    const { error } = await supabase.from('prescriptions').insert({ ...form, clinic_id: profile!.clinic_id, prescribed_by: profile!.id })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Prescription saved')
    setShowModal(false)
    await loadData(query)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search medications..." className="w-full pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 text-white text-[13px] font-semibold rounded-lg" style={{ background: '#0d9488' }}>
          <Plus size={14} /> New Prescription
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Date','Pet','Owner','Medication','Dosage','Frequency','Duration',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prescriptions.map(rx => (
              <tr key={rx.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 text-[12px] text-slate-500">{new Date(rx.created_at).toLocaleDateString('en-PH')}</td>
                <td className="px-4 py-3"><div className="text-[13px] font-semibold text-slate-800">{rx.pet?.name}</div><div className="text-[11px] text-slate-400">{rx.pet?.species}</div></td>
                <td className="px-4 py-3 text-[12px] text-slate-600">{rx.pet?.owner?.full_name}</td>
                <td className="px-4 py-3"><div className="text-[13px] font-semibold text-slate-800">{rx.medication_name}</div></td>
                <td className="px-4 py-3 text-[12px] text-slate-600">{rx.dosage}</td>
                <td className="px-4 py-3 text-[12px] text-slate-600">{rx.frequency}</td>
                <td className="px-4 py-3 text-[12px] text-slate-600">{rx.duration}</td>
                <td className="px-4 py-3"><button className="text-slate-400 hover:text-teal-600"><Printer size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {prescriptions.length === 0 && <div className="py-16 text-center text-slate-400 text-[13px]">No prescriptions yet</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100"><h2 className="text-[16px] font-bold text-slate-800">New Prescription</h2></div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Pet *</label>
                <select value={form.pet_id} onChange={e => setForm(f => ({...f, pet_id: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="">Select pet...</option>
                  {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species}) — {p.owner?.full_name}</option>)}
                </select></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Medication *</label>
                <input list="meds" value={form.medication_name} onChange={e => setForm(f => ({...f, medication_name: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Type or select..." />
                <datalist id="meds">{COMMON_MEDS.map(m => <option key={m} value={m} />)}</datalist></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Dosage *</label>
                  <input value={form.dosage} onChange={e => setForm(f => ({...f, dosage: e.target.value}))} placeholder="e.g. 10mg/kg" className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
                <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Frequency *</label>
                  <select value={form.frequency} onChange={e => setForm(f => ({...f, frequency: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                    {FREQUENCY_OPTIONS.map(fo => <option key={fo}>{fo}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Duration</label>
                <input value={form.duration} onChange={e => setForm(f => ({...f, duration: e.target.value}))} placeholder="e.g. 7 days" className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Special Instructions</label>
                <textarea value={form.instructions} onChange={e => setForm(f => ({...f, instructions: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" rows={2} placeholder="e.g. Give with food" /></div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={loading || !form.pet_id || !form.medication_name || !form.dosage} className="px-6 py-2 text-[13px] font-semibold text-white rounded-lg disabled:opacity-50" style={{ background: '#0d9488' }}>
                {loading ? 'Saving...' : 'Save Prescription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
