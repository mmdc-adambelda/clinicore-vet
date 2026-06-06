'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, CheckCircle, PawPrint, Stethoscope, ClipboardList, Activity, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const WORKFLOW_STEPS = ['triage','consultation','diagnosis','treatment_plan','procedure','billing','follow_up']
const STEP_LABELS: Record<string,string> = {
  triage: 'Triage', consultation: 'Consultation', diagnosis: 'Diagnosis',
  treatment_plan: 'Treatment Plan', procedure: 'Procedure', billing: 'Billing', follow_up: 'Follow-up'
}
const TRIAGE_COLORS: Record<string,string> = {
  emergency: 'bg-red-100 text-red-700 border-red-200',
  urgent:    'bg-orange-100 text-orange-700 border-orange-200',
  semi_urgent:'bg-amber-100 text-amber-700 border-amber-200',
  routine:   'bg-emerald-100 text-emerald-700 border-emerald-200',
}
const BCS_LABELS: Record<number,string> = {
  1:'Emaciated', 2:'Very thin', 3:'Thin', 4:'Underweight', 5:'Ideal',
  6:'Overweight', 7:'Heavy', 8:'Obese', 9:'Morbidly obese'
}

export default function ClinicalWorkflowView({ visit }: { visit: any }) {
  const [form, setForm] = useState({
    triage_level: visit.triage_level || 'routine',
    chief_complaint: visit.chief_complaint || '',
    subjective: visit.subjective || '',
    objective: visit.objective || '',
    assessment: visit.assessment || '',
    plan: visit.plan || '',
    weight_kg: visit.weight_kg || '',
    temperature_c: visit.temperature_c || '',
    heart_rate: visit.heart_rate || '',
    respiratory_rate: visit.respiratory_rate || '',
    body_condition_score: visit.body_condition_score || 5,
    diagnosis_code: visit.diagnosis_code || '',
    diagnosis_description: visit.diagnosis_description || '',
    workflow_step: visit.workflow_step || 'consultation',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function save(complete = false) {
    setSaving(true)
    const payload: any = { ...form, weight_kg: form.weight_kg ? parseFloat(String(form.weight_kg)) : null, temperature_c: form.temperature_c ? parseFloat(String(form.temperature_c)) : null, heart_rate: form.heart_rate ? parseInt(String(form.heart_rate)) : null, respiratory_rate: form.respiratory_rate ? parseInt(String(form.respiratory_rate)) : null }
    if (complete) { payload.status = 'completed' }
    const { error } = await supabase.from('clinical_visits').update(payload).eq('id', visit.id)
    if (error) { toast.error(error.message) } else { toast.success(complete ? 'Visit completed!' : 'Progress saved') }
    setSaving(false)
  }

  const pet = visit.pet
  const owner = visit.owner

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-2xl">
              {pet?.species === 'Dog' ? '🐕' : pet?.species === 'Cat' ? '🐈' : '🐾'}
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-slate-800">{pet?.name}</h2>
              <div className="text-[12px] text-slate-500">{pet?.species}{pet?.breed ? ` · ${pet.breed}` : ''} · Owner: {owner?.full_name}</div>
              {pet?.known_allergies && <div className="mt-1 text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded inline-block">⚠ Allergies: {pet.known_allergies}</div>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 text-[12px] font-semibold border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-50">
              <Save size={13} className="inline mr-1.5" />{saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => save(true)} disabled={saving || visit.status === 'completed'} className="px-4 py-2 text-[12px] font-semibold text-white rounded-lg disabled:opacity-50" style={{ background: '#0d9488' }}>
              <CheckCircle size={13} className="inline mr-1.5" />Complete Visit
            </button>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="mt-4 flex items-center gap-1 overflow-x-auto">
          {WORKFLOW_STEPS.map((step, i) => (
            <button key={step} onClick={() => setForm(f => ({...f, workflow_step: step}))}
              className={cn('px-3 py-1.5 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-colors', form.workflow_step === step ? 'text-white' : 'text-slate-500 hover:bg-slate-100')}
              style={form.workflow_step === step ? { background: '#0d9488' } : {}}>
              {i + 1}. {STEP_LABELS[step]}
            </button>
          ))}
        </div>
      </div>

      {/* Triage */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-[13px] font-bold text-slate-700 mb-4 flex items-center gap-2"><AlertTriangle size={14} /> Triage Level</h3>
        <div className="grid grid-cols-4 gap-3">
          {(['emergency','urgent','semi_urgent','routine'] as const).map(level => (
            <button key={level} onClick={() => setForm(f => ({...f, triage_level: level}))}
              className={cn('px-3 py-2.5 rounded-lg border text-[12px] font-semibold capitalize transition-all', form.triage_level === level ? TRIAGE_COLORS[level] + ' ring-2 ring-offset-1' : 'border-slate-200 text-slate-500 hover:bg-slate-50')}>
              {level.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chief Complaint</label>
          <input value={form.chief_complaint} onChange={e => setForm(f => ({...f, chief_complaint: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Primary reason for visit..." />
        </div>
      </div>

      {/* Vitals */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-[13px] font-bold text-slate-700 mb-4 flex items-center gap-2"><Activity size={14} /> Vitals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Weight (kg)</label>
            <input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm(f => ({...f, weight_kg: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Temp (°C)</label>
            <input type="number" step="0.1" value={form.temperature_c} onChange={e => setForm(f => ({...f, temperature_c: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="38.5" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Heart Rate (bpm)</label>
            <input type="number" value={form.heart_rate} onChange={e => setForm(f => ({...f, heart_rate: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="80" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Resp. Rate (rpm)</label>
            <input type="number" value={form.respiratory_rate} onChange={e => setForm(f => ({...f, respiratory_rate: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="20" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-[11px] font-semibold text-slate-600 mb-2">Body Condition Score (BCS): <span className="text-teal-600">{form.body_condition_score}/9 — {BCS_LABELS[form.body_condition_score as number]}</span></label>
          <div className="flex gap-1">
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} onClick={() => setForm(f => ({...f, body_condition_score: n}))}
                className={cn('flex-1 py-2 rounded text-[11px] font-bold transition-colors', Number(form.body_condition_score) === n ? 'text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
                style={Number(form.body_condition_score) === n ? { background: '#0d9488' } : {}}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SOAP Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-[13px] font-bold text-slate-700 mb-4 flex items-center gap-2"><ClipboardList size={14} /> SOAP Notes</h3>
        <div className="space-y-4">
          {[['subjective','S — Subjective (History / Owner Report)'], ['objective','O — Objective (Physical Exam Findings)'], ['assessment','A — Assessment (Differential Diagnosis)'], ['plan','P — Plan (Treatment & Follow-up)']].map(([field, label]) => (
            <div key={field}>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">{label}</label>
              <textarea value={(form as any)[field]} onChange={e => setForm(f => ({...f, [field]: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" rows={3} />
            </div>
          ))}
        </div>
      </div>

      {/* Diagnosis */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-[13px] font-bold text-slate-700 mb-4 flex items-center gap-2"><Stethoscope size={14} /> Diagnosis</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Diagnosis Code</label>
            <input value={form.diagnosis_code} onChange={e => setForm(f => ({...f, diagnosis_code: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="ICD-10 / VeNom code" />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Diagnosis Description</label>
            <input value={form.diagnosis_description} onChange={e => setForm(f => ({...f, diagnosis_description: e.target.value}))} className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Primary diagnosis..." />
          </div>
        </div>
      </div>
    </div>
  )
}
