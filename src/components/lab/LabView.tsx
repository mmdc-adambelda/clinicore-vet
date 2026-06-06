'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, FlaskConical, Upload, CheckCircle, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const LAB_TESTS = ['Complete Blood Count (CBC)','Blood Chemistry Panel','Urinalysis','Fecal Flotation','Heartworm Test','Parvovirus Test','FeLV/FIV Test','X-Ray (1 view)','Ultrasound','Skin Scraping','Ear Cytology','Fine Needle Aspirate','Thyroid Panel','ACTH Stimulation','Bile Acids']
const STATUS_COLORS: Record<string,string> = {
  pending:   'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
}

export default function LabView({ initialResults }: { initialResults: any[] }) {
  const [results, setResults] = useState(initialResults)
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pets, setPets] = useState<any[]>([])
  const [form, setForm] = useState({ pet_id:'', test_name:'', requested_date: new Date().toISOString().split('T')[0], result_summary:'', findings:'', status:'pending', notes:'' })
  const supabase = createClient()

  useEffect(() => {
    supabase.from('pets').select('id, name, species, owner:owners(full_name)').eq('is_active', true).then(({ data }) => { if (data) setPets(data) })
  }, [supabase])

  const loadResults = useCallback(async (q = '') => {
    let qb = supabase.from('lab_results').select('*, pet:pets(name, species, owner:owners(full_name))').order('created_at', { ascending: false }).limit(50)
    if (q) qb = qb.ilike('test_name', `%${q}%`)
    const { data } = await qb
    if (data) setResults(data)
  }, [supabase])

  useEffect(() => { const t = setTimeout(() => loadResults(query), 300); return () => clearTimeout(t) }, [query, loadResults])

  async function save() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('staff_profiles').select('clinic_id, id').eq('id', user!.id).single()
    const { error } = await supabase.from('lab_results').insert({ ...form, clinic_id: profile!.clinic_id, requested_by: profile!.id })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Lab request saved')
    setShowModal(false)
    await loadResults(query)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tests..." className="w-full pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 text-white text-[13px] font-semibold rounded-lg" style={{ background: '#0d9488' }}>
          <Plus size={14} /> Request Lab Test
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Date','Pet','Test','Result Summary','Status','Notes'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-3 text-[12px] text-slate-500">{new Date(r.created_at).toLocaleDateString('en-PH')}</td>
                <td className="px-4 py-3"><div className="text-[13px] font-semibold text-slate-800">{r.pet?.name}</div><div className="text-[11px] text-slate-400">{r.pet?.owner?.full_name}</div></td>
                <td className="px-4 py-3 text-[13px] font-medium text-slate-700">{r.test_name}</td>
                <td className="px-4 py-3 text-[12px] text-slate-600 max-w-[200px] truncate">{r.result_summary || '—'}</td>
                <td className="px-4 py-3"><span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full', STATUS_COLORS[r.status] ?? 'bg-slate-100 text-slate-500')}>{r.status}</span></td>
                <td className="px-4 py-3 text-[11px] text-slate-400 max-w-[150px] truncate">{r.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 && <div className="py-16 text-center text-slate-400 text-[13px]">No lab results yet</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100"><h2 className="text-[16px] font-bold text-slate-800">Request Lab / Diagnostic Test</h2></div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Pet *</label>
                <select value={form.pet_id} onChange={e => setForm(f => ({...f, pet_id: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="">Select pet...</option>
                  {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.species}) — {p.owner?.full_name}</option>)}
                </select></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Test *</label>
                <input list="lab-tests" value={form.test_name} onChange={e => setForm(f => ({...f, test_name: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Type or select..." />
                <datalist id="lab-tests">{LAB_TESTS.map(t => <option key={t} value={t} />)}</datalist></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Result Summary</label>
                <textarea value={form.result_summary} onChange={e => setForm(f => ({...f, result_summary: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" rows={3} placeholder="Enter results when available..." /></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select></div>
              <div><label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" rows={2} /></div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-[13px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={save} disabled={loading || !form.pet_id || !form.test_name} className="px-6 py-2 text-[13px] font-semibold text-white rounded-lg disabled:opacity-50" style={{ background: '#0d9488' }}>
                {loading ? 'Saving...' : 'Save Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
