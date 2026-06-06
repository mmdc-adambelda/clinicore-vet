'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Shield, User, Clock, Building2 } from 'lucide-react'

const VET_ROLES = [
  { value: 'owner',         label: 'Clinic Owner',     color: 'bg-purple-100 text-purple-700', desc: 'Full access to all features including financials and settings' },
  { value: 'veterinarian',  label: 'Veterinarian',     color: 'bg-blue-100 text-blue-700',   desc: 'Full clinical access: SOAP notes, prescriptions, lab orders' },
  { value: 'vet_tech',      label: 'Vet Technician',   color: 'bg-teal-100 text-teal-700',   desc: 'Vitals, vaccinations, prep, and assisting veterinarians' },
  { value: 'receptionist',  label: 'Receptionist',     color: 'bg-emerald-100 text-emerald-700', desc: 'Appointments, owner/pet registration, billing (view only)' },
  { value: 'front_desk',    label: 'Front Desk',       color: 'bg-green-100 text-green-700', desc: 'Check-in/out, invoicing, and payment recording' },
  { value: 'groomer',       label: 'Groomer',          color: 'bg-orange-100 text-orange-700', desc: 'Grooming schedule and service recording only' },
  { value: 'billing_staff', label: 'Billing Staff',    color: 'bg-yellow-100 text-yellow-700', desc: 'Invoicing, payments, and financial reports' },
]

const PERMISSION_MATRIX: Record<string, string[]> = {
  owner:        ['dashboard','appointments','owners','clinical','vaccinations','prescriptions','lab','billing','inventory','reports','settings'],
  veterinarian: ['dashboard','appointments','owners','clinical','vaccinations','prescriptions','lab','billing','reports'],
  vet_tech:     ['dashboard','appointments','owners','clinical','vaccinations','lab'],
  receptionist: ['dashboard','appointments','owners','vaccinations'],
  front_desk:   ['dashboard','appointments','owners','billing'],
  groomer:      ['dashboard','appointments','owners'],
  billing_staff:['dashboard','billing','reports'],
}

const TABS = ['Clinic Profile', 'Staff & Roles', 'Exam Rooms', 'Procedure Templates', 'Audit Log']

export default function SettingsView({ staff: initialStaff }: { staff: any[] }) {
  const [tab, setTab] = useState('Clinic Profile')
  const [staff, setStaff] = useState<any[]>(initialStaff)
  const [rooms, setRooms] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [clinic, setClinic] = useState<any>(null)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [editStaff, setEditStaff] = useState<any>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const { data: s } = await sb.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
    if (!s) return

    const [cRes, rRes, tRes, aRes] = await Promise.all([
      sb.from('clinics').select('*').eq('id', s.clinic_id).single(),
      sb.from('exam_rooms').select('*').eq('clinic_id', s.clinic_id).order('room_number'),
      sb.from('procedure_templates').select('*').eq('clinic_id', s.clinic_id).order('name'),
      sb.from('audit_logs').select('*').eq('clinic_id', s.clinic_id).order('created_at', { ascending: false }).limit(50),
    ])
    if (cRes.data) setClinic(cRes.data)
    if (rRes.data) setRooms(rRes.data)
    if (tRes.data) setTemplates(tRes.data)
    if (aRes.data) setAuditLogs(aRes.data)
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              tab === t ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t}
          </button>
        ))}
      </div>

      {/* Clinic Profile */}
      {tab === 'Clinic Profile' && (
        <ClinicProfilePanel clinic={clinic} onSaved={loadAll}/>
      )}

      {/* Staff & Roles */}
      {tab === 'Staff & Roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Staff Members & Roles</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage access permissions by assigning roles to each staff member</p>
            </div>
            <button onClick={() => setShowAddStaff(true)}
              className="flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700">
              <Plus size={15}/> Add Staff
            </button>
          </div>

          {/* Role legend */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="col-span-2 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Role Permissions</div>
            {VET_ROLES.map(r => (
              <div key={r.value} className="flex items-start gap-2">
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', r.color)}>{r.label}</span>
                <span className="text-xs text-slate-500">{r.desc}</span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Name','Email','Role','Access','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staff.map(s => {
                  const role = VET_ROLES.find(r => r.value === s.role)
                  const perms = PERMISSION_MATRIX[s.role] || []
                  return (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                            {s.full_name?.[0]?.toUpperCase()}
                          </div>
                          <div className="text-sm font-semibold text-slate-900">{s.full_name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{s.email}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', role?.color || 'bg-slate-100 text-slate-600')}>
                          {role?.label || s.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {perms.map(p => (
                            <span key={p} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded capitalize">{p}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                          s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400')}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setEditStaff(s)}
                          className="flex items-center gap-1 text-xs font-semibold text-teal-600 border border-teal-200 px-2 py-1 rounded-lg hover:bg-teal-50">
                          <Pencil size={11}/> Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exam Rooms */}
      {tab === 'Exam Rooms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Exam Rooms</h3>
              <p className="text-xs text-slate-500 mt-0.5">Configure examination, surgery, and recovery rooms</p>
            </div>
            <button onClick={() => setShowAddRoom(true)}
              className="flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700">
              <Plus size={15}/> Add Room
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {rooms.map(r => (
              <div key={r.id} className={cn('border rounded-xl p-4',
                r.status === 'available' ? 'border-emerald-200 bg-emerald-50' :
                r.status === 'occupied'  ? 'border-amber-200 bg-amber-50' :
                'border-slate-200 bg-slate-50')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold text-slate-900">Room {r.room_number}</div>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                    r.status === 'available' ? 'bg-emerald-200 text-emerald-800' :
                    r.status === 'occupied'  ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600')}>
                    {r.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 capitalize">{r.room_type?.replace('_', ' ')}</div>
                {r.notes && <div className="text-xs text-slate-400 mt-1">{r.notes}</div>}
              </div>
            ))}
            {rooms.length === 0 && (
              <div className="col-span-3 text-center py-12 text-slate-400">
                <Building2 size={32} className="mx-auto mb-2 text-slate-300"/>
                <p className="text-sm">No rooms configured yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Procedure Templates */}
      {tab === 'Procedure Templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Procedure Price Templates</h3>
              <p className="text-xs text-slate-500 mt-0.5">Default prices auto-fill when creating invoices</p>
            </div>
            <button onClick={() => setShowAddTemplate(true)}
              className="flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700">
              <Plus size={15}/> Add Template
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Service / Procedure','Category','Default Price'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{t.category}</td>
                    <td className="px-4 py-3 text-sm font-bold text-teal-600">₱{Number(t.default_cost).toLocaleString()}</td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-12 text-slate-400 text-sm">No templates yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log */}
      {tab === 'Audit Log' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Audit Log</h3>
            <p className="text-xs text-slate-500 mt-0.5">Last 50 actions performed in the clinic system</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Timestamp','User','Action','Resource'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">
                      {new Date(log.created_at).toLocaleString('en-PH', { dateStyle:'short', timeStyle:'short' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{log.user_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{log.action}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 capitalize">{log.resource_type}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-12 text-slate-400 text-sm">No audit records yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddStaff && (
        <StaffModal onClose={() => setShowAddStaff(false)} onSaved={() => { setShowAddStaff(false); loadAll() }}/>
      )}
      {editStaff && (
        <StaffModal staff={editStaff} onClose={() => setEditStaff(null)} onSaved={() => { setEditStaff(null); loadAll() }}/>
      )}
      {showAddRoom && (
        <RoomModal onClose={() => setShowAddRoom(false)} onSaved={() => { setShowAddRoom(false); loadAll() }}/>
      )}
      {showAddTemplate && (
        <TemplateModal onClose={() => setShowAddTemplate(false)} onSaved={() => { setShowAddTemplate(false); loadAll() }}/>
      )}
    </div>
  )
}

// ── CLINIC PROFILE PANEL ──────────────────────────────────────
function ClinicProfilePanel({ clinic, onSaved }: { clinic: any; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', address: '', contact_number: '', email: '', tin: '', logo_url: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (clinic) setForm({
      name:           clinic.name || '',
      address:        clinic.address || '',
      contact_number: clinic.contact_number || '',
      email:          clinic.email || '',
      tin:            clinic.tin || '',
      logo_url:       clinic.logo_url || '',
    })
  }, [clinic])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const { data: staff } = await sb.from('staff_profiles').select('clinic_id').eq('id', user!.id).single()
    const { error } = await sb.from('clinics').update(form).eq('id', staff?.clinic_id)
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Clinic profile updated')
    setLoading(false)
    onSaved()
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-xl space-y-4">
      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><Building2 size={16}/> Clinic Profile</h3>
      {[
        ['Clinic Name', 'name', 'ClinicCore Vet - Main Branch'],
        ['Address', 'address', '123 Pet Street, Makati City'],
        ['Contact Number', 'contact_number', '09XX-XXX-XXXX'],
        ['Email', 'email', 'clinic@example.com'],
        ['TIN', 'tin', '000-000-000-000'],
      ].map(([label, key, placeholder]) => (
        <div key={key}>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
          <input value={(form as any)[key]} onChange={e => set(key, e.target.value)}
            placeholder={placeholder}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
        </div>
      ))}
      <button onClick={save} disabled={loading}
        className="bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

// ── STAFF MODAL ───────────────────────────────────────────────
function StaffModal({ staff, onClose, onSaved }: { staff?: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: staff?.full_name || '',
    email:     staff?.email || '',
    role:      staff?.role || 'receptionist',
    is_active: staff?.is_active ?? true,
  })
  const [loading, setLoading] = useState(false)
  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!form.full_name.trim()) { toast.error('Name is required'); return }
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const { data: s } = await sb.from('staff_profiles').select('clinic_id').eq('id', user!.id).single()
    let error
    if (staff?.id) {
      ({ error } = await sb.from('staff_profiles').update({ full_name: form.full_name, role: form.role, is_active: form.is_active }).eq('id', staff.id))
    } else {
      toast.error('To add new staff, invite them via Supabase Auth first, then assign their role here.')
      setLoading(false)
      return
    }
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Staff updated')
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">{staff ? 'Edit Staff' : 'Add Staff'}</h2>
          <button onClick={onClose} className="text-slate-400 text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Role *</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400">
              {VET_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">{VET_ROLES.find(r => r.value === form.role)?.desc}</p>
          </div>
          {staff && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="accent-teal-500"/>
              <span className="text-sm font-semibold text-slate-700">Active (can log in)</span>
            </label>
          )}
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
            {loading ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── ROOM MODAL ────────────────────────────────────────────────
function RoomModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ room_number: '', room_type: 'exam', notes: '' })
  const [loading, setLoading] = useState(false)
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!form.room_number.trim()) { toast.error('Room number is required'); return }
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const { data: s } = await sb.from('staff_profiles').select('clinic_id').eq('id', user!.id).single()
    const { error } = await sb.from('exam_rooms').insert({ ...form, clinic_id: s?.clinic_id, status: 'available' })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Room added')
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Add Exam Room</h2>
          <button onClick={onClose} className="text-slate-400 text-xl">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Room Number / Name *</label>
            <input value={form.room_number} onChange={e => set('room_number', e.target.value)}
              placeholder="e.g. 1, 2A, Surgery 1"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Room Type</label>
            <select value={form.room_type} onChange={e => set('room_type', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400">
              <option value="exam">Examination Room</option>
              <option value="surgery">Surgery Suite</option>
              <option value="isolation">Isolation Ward</option>
              <option value="recovery">Recovery Room</option>
              <option value="grooming">Grooming Station</option>
              <option value="lab">Laboratory</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Equipment notes, special features…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
            {loading ? 'Adding…' : 'Add Room'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── TEMPLATE MODAL ─────────────────────────────────────────────
function TemplateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', category: 'Wellness', default_cost: '' })
  const [loading, setLoading] = useState(false)
  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!form.name.trim() || !form.default_cost) { toast.error('Name and price are required'); return }
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const { data: s } = await sb.from('staff_profiles').select('clinic_id').eq('id', user!.id).single()
    const { error } = await sb.from('procedure_templates').insert({
      clinic_id:    s?.clinic_id,
      name:         form.name.trim(),
      category:     form.category,
      default_cost: parseFloat(form.default_cost),
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Template added')
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Add Procedure Template</h2>
          <button onClick={onClose} className="text-slate-400 text-xl">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Service Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="e.g. Annual Wellness Exam"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400">
              {['Wellness','Vaccination','Surgery','Dental','Diagnostics','Grooming','Emergency','Other'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Default Price (₱) *</label>
            <input type="number" min="0" value={form.default_cost} onChange={e => set('default_cost', e.target.value)}
              placeholder="0.00"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
            {loading ? 'Adding…' : 'Add Template'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}
