'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Invoice } from '@/types'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn, formatDate, formatPHP } from '@/lib/utils'
import { Plus, Search, Printer, CreditCard } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  paid:      'bg-emerald-100 text-emerald-700',
  draft:     'bg-slate-100 text-slate-600',
  issued:    'bg-blue-100 text-blue-700',
  partial:   'bg-amber-100 text-amber-700',
  overdue:   'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-400',
}

const VET_PROCEDURES = [
  'Wellness Exam','Vaccination - Rabies','Vaccination - Distemper','Vaccination - Parvo',
  'Vaccination - Bordetella','Vaccination - Feline 3-in-1','Spay (Female)','Neuter (Male)',
  'Dental Prophylaxis','Wound Cleaning & Dressing','Wound Suturing','Blood Panel (CBC)',
  'Blood Chemistry Panel','Urinalysis','Fecal Exam','Ear Cytology','Skin Scraping',
  'X-Ray (per view)','Ultrasound Abdomen','Ultrasound Cardiac','Deworming','Flea Treatment',
  'Tick Treatment','Microchipping','Grooming - Bath & Blow Dry','Grooming - Full Groom',
  'Nail Trimming','Ear Cleaning','IV Fluid Therapy (per day)','Hospitalization (per day)',
  'Surgical Procedure','Anesthesia','Post-op Monitoring','Emergency Consultation',
  'Follow-up Consultation','Second Opinion Consultation',
]

export default function BillingView({ invoices: initial }: { invoices: Invoice[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>(initial)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showOR, setShowOR] = useState<Invoice | null>(null)
  const [payModal, setPayModal] = useState<Invoice | null>(null)

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowCreate(true)
  }, [searchParams])

  async function reload() {
    const sb = createClient()
    const { data } = await sb
      .from('invoices')
      .select('*, owner:owners(full_name, contact_number), pet:pets(name, species), payments(*)')
      .order('created_at', { ascending: false })
    if (data) setInvoices(data as any)
  }

  const filtered = invoices.filter(inv => {
    const matchFilter =
      filter === 'all'     ? true :
      filter === 'pending' ? ['issued', 'partial'].includes(inv.status) :
      filter === 'overdue' ? inv.status === 'overdue' :
      filter === 'paid'    ? inv.status === 'paid' : true
    const matchSearch = search
      ? (inv as any).owner?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        (inv as any).pet?.name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.or_number?.toLowerCase().includes(search.toLowerCase())
      : true
    return matchFilter && matchSearch
  })

  const total       = invoices.reduce((s, i) => s + Number(i.total_amount), 0)
  const collected   = invoices.reduce((s, i) => s + Number(i.amount_paid), 0)
  const outstanding = invoices.reduce((s, i) => s + Number(i.balance), 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          ['Total Billed',    total,       'text-slate-900',   'bg-white'],
          ['Collected',       collected,   'text-emerald-600', 'bg-emerald-50'],
          ['Outstanding',     outstanding, 'text-red-600',     'bg-red-50'],
        ].map(([l, v, c, bg]) => (
          <div key={l as string} className={cn('border border-slate-200 rounded-xl p-5', bg as string)}>
            <div className="text-xs text-slate-500 font-medium mb-1">{l}</div>
            <div className={cn('text-2xl font-bold', c as string)}>{formatPHP(Number(v))}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {[['all','All'],['pending','Pending'],['overdue','Overdue'],['paid','Paid']].map(([val,lbl]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={cn('px-3 py-1.5 text-sm font-semibold rounded-lg border transition-colors',
                filter === val ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 bg-white hover:border-teal-300 hover:text-teal-600')}>
              {lbl}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:border-teal-400">
            <Search size={13} className="text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search owner, pet or OR#…"
              className="outline-none text-sm w-48 placeholder:text-slate-400"/>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700">
            <Plus size={15}/> Create Invoice
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['OR Number','Pet / Owner','Date','Total','Paid','Balance','Mode','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                <td className="px-4 py-3 text-sm font-mono font-semibold text-teal-600">{inv.or_number}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{(inv as any).pet?.name || '—'}</div>
                  <div className="text-xs text-slate-400">{(inv as any).owner?.full_name}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{formatDate(inv.issued_at)}</td>
                <td className="px-4 py-3 text-sm font-bold">{formatPHP(Number(inv.total_amount))}</td>
                <td className="px-4 py-3 text-sm text-emerald-600 font-semibold">{formatPHP(Number(inv.amount_paid))}</td>
                <td className="px-4 py-3 text-sm font-bold text-red-600">
                  {Number(inv.balance) > 0 ? formatPHP(Number(inv.balance)) : <span className="text-emerald-600">Settled</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 capitalize">{inv.payment_mode?.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[inv.status])}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 items-center">
                    {Number(inv.balance) > 0 && (
                      <button onClick={() => setPayModal(inv)}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-600 border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-50 whitespace-nowrap">
                        <CreditCard size={11}/> Pay
                      </button>
                    )}
                    <button onClick={() => setShowOR(inv)}
                      className="flex items-center gap-1 text-xs font-semibold text-teal-600 border border-teal-200 px-2 py-1 rounded-lg hover:bg-teal-50 whitespace-nowrap">
                      <Printer size={11}/> OR
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-16 text-slate-400">
                <div className="text-3xl mb-2">🧾</div>
                <p className="text-sm font-medium">No invoices found.</p>
                <button onClick={() => setShowCreate(true)} className="mt-3 text-xs font-semibold text-teal-600 hover:underline">
                  Create the first invoice →
                </button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateInvoiceModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); reload() }}
        />
      )}
      {showOR && <ORModal invoice={showOR} onClose={() => setShowOR(null)} />}
      {payModal && (
        <PaymentModal
          invoice={payModal}
          onClose={() => { setPayModal(null); reload() }}
        />
      )}
    </div>
  )
}

// ── CREATE INVOICE MODAL ──────────────────────────────────────
function CreateInvoiceModal({ onClose, onSaved, visitId, petIdPrefill }: {
  onClose: () => void
  onSaved: () => void
  visitId?: string
  petIdPrefill?: string
}) {
  const [loading, setLoading] = useState(false)
  const [owners, setOwners] = useState<any[]>([])
  const [ownerSearch, setOwnerSearch] = useState('')
  const [showOwnerList, setShowOwnerList] = useState(false)
  const [owner, setOwner] = useState<any>(null)
  const [pets, setPets] = useState<any[]>([])
  const [pet, setPet] = useState<any>(null)
  const [items, setItems] = useState([{ procedure_name: '', quantity: 1, unit_cost: 0 }])
  const [discount, setDiscount] = useState(0)
  const [paymentMode, setPaymentMode] = useState('cash')
  const [hmo, setHmo] = useState('')
  const [notes, setNotes] = useState('')
  const [templates, setTemplates] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const [tRes] = await Promise.all([
        sb.from('procedure_templates').select('name, default_cost, category').order('name'),
      ])
      if (tRes.data) setTemplates(tRes.data)

      if (petIdPrefill) {
        const { data } = await sb.from('pets')
          .select('id, name, species, owner:owners(id, full_name, contact_number)')
          .eq('id', petIdPrefill).single()
        if (data) {
          setPet(data)
          setOwner((data as any).owner)
          setOwnerSearch((data as any).owner?.full_name || '')
        }
      }
    }
    load()
  }, [petIdPrefill])

  useEffect(() => {
    if (!ownerSearch.trim()) { setOwners([]); setShowOwnerList(false); return }
    if (owner) return
    const t = setTimeout(async () => {
      const sb = createClient()
      const { data } = await sb.from('owners')
        .select('id, full_name, contact_number')
        .eq('is_active', true).ilike('full_name', `%${ownerSearch}%`).limit(8)
      setOwners(data || [])
      setShowOwnerList(true)
    }, 300)
    return () => clearTimeout(t)
  }, [ownerSearch, owner])

  useEffect(() => {
    if (!owner) { setPets([]); setPet(null); return }
    async function loadPets() {
      const sb = createClient()
      const { data } = await sb.from('pets')
        .select('id, name, species').eq('owner_id', owner.id).eq('is_active', true)
      setPets(data || [])
      if (data?.length === 1) setPet(data[0])
    }
    loadPets()
  }, [owner])

  const subtotal = items.reduce((s, i) => s + (Number(i.unit_cost) * Number(i.quantity)), 0)
  const discountAmt = Math.round(subtotal * discount / 100)
  const total = subtotal - discountAmt

  function addItem() { setItems(p => [...p, { procedure_name: '', quantity: 1, unit_cost: 0 }]) }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, k: string, v: string | number) {
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  }
  function applyTemplate(i: number, tpl: any) {
    setItems(p => p.map((item, idx) => idx === i
      ? { ...item, procedure_name: tpl.name, unit_cost: Number(tpl.default_cost) || 0 }
      : item
    ))
  }

  async function save() {
    if (!owner) { toast.error('Select an owner'); return }
    if (!pet) { toast.error('Select a pet'); return }
    if (items.some(i => !i.procedure_name.trim())) { toast.error('All items need a service name'); return }
    if (total <= 0) { toast.error('Total must be greater than 0'); return }

    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }
    const { data: staff } = await sb.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
    if (!staff) { toast.error('Staff profile not found'); setLoading(false); return }

    const { data: invoice, error: invErr } = await sb.from('invoices').insert({
      clinic_id:    staff.clinic_id,
      owner_id:     owner.id,
      pet_id:       pet.id,
      visit_id:     visitId || null,
      subtotal,
      discount_pct: discount,
      payment_mode: paymentMode,
      hmo_provider: hmo || null,
      notes:        notes || null,
      status:       'issued',
      created_by:   user.id,
    }).select().single()

    if (invErr || !invoice) { toast.error(invErr?.message || 'Failed to create invoice'); setLoading(false); return }

    // Insert line items
    await sb.from('invoice_items').insert(
      items.map(item => ({
        invoice_id:     invoice.id,
        procedure_name: item.procedure_name,
        quantity:       item.quantity,
        unit_cost:      item.unit_cost,
        total_cost:     item.unit_cost * item.quantity,
      }))
    )

    await sb.from('audit_logs').insert({
      clinic_id: staff.clinic_id, user_id: user.id,
      action: `Invoice created: ${invoice.or_number} — ${pet.name} (${owner.full_name})`,
      resource_type: 'invoice', resource_id: invoice.id,
    }).maybeSingle()

    toast.success(`Invoice ${invoice.or_number} created — ₱${total.toLocaleString()}`)
    setLoading(false)
    onSaved()
  }

  const SPECIES_EMOJI: Record<string, string> = {
    dog:'🐕', cat:'🐈', bird:'🐦', rabbit:'🐇', hamster:'🐹',
    reptile:'🦎', fish:'🐠', guinea_pig:'🐾', other:'🐾'
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Create Invoice</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="space-y-5">
          {/* Owner */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Pet Owner *</label>
            {owner ? (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold">{owner.full_name}</div>
                  <div className="text-xs text-slate-500">{owner.contact_number}</div>
                </div>
                <button onClick={() => { setOwner(null); setOwnerSearch(''); setPet(null) }} className="text-slate-400 hover:text-red-500 font-bold ml-3">✕</button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 focus-within:border-teal-400">
                  <Search size={13} className="text-slate-400"/>
                  <input value={ownerSearch} onChange={e => setOwnerSearch(e.target.value)}
                    onFocus={() => owners.length > 0 && setShowOwnerList(true)}
                    placeholder="Type owner name…"
                    className="flex-1 outline-none text-sm placeholder:text-slate-400"/>
                </div>
                {showOwnerList && owners.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 mt-1 max-h-40 overflow-y-auto">
                    {owners.map(o => (
                      <div key={o.id} onClick={() => { setOwner(o); setOwnerSearch(o.full_name); setShowOwnerList(false) }}
                        className="px-4 py-2.5 hover:bg-teal-50 cursor-pointer border-b border-slate-100 last:border-0 text-sm font-semibold">
                        {o.full_name} <span className="text-xs font-normal text-slate-400">· {o.contact_number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pet */}
          {owner && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Pet *</label>
              {pets.length === 0 ? (
                <div className="text-sm text-slate-400 italic">No active pets found for this owner.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pets.map(p => (
                    <button key={p.id} onClick={() => setPet(p)}
                      className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors',
                        pet?.id === p.id
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'border-slate-200 hover:border-teal-300 hover:text-teal-700')}>
                      <span>{SPECIES_EMOJI[p.species] || '🐾'}</span> {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Services / Procedures *</label>
              <button onClick={addItem} className="text-xs font-semibold text-teal-600 hover:underline">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input
                      list="vet-procedures"
                      value={item.procedure_name}
                      onChange={e => {
                        updateItem(i, 'procedure_name', e.target.value)
                        const tpl = templates.find(t => t.name === e.target.value)
                        if (tpl) updateItem(i, 'unit_cost', Number(tpl.default_cost) || 0)
                      }}
                      placeholder="Service or procedure name…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"
                    />
                    <datalist id="vet-procedures">
                      {VET_PROCEDURES.map(p => <option key={p} value={p}/>)}
                      {templates.map(t => <option key={t.name} value={t.name}/>)}
                    </datalist>
                  </div>
                  <div className="w-16">
                    <label className="block text-[10px] text-slate-400 mb-1">Qty</label>
                    <input type="number" min="1" value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-teal-400 text-center"/>
                  </div>
                  <div className="w-28">
                    <label className="block text-[10px] text-slate-400 mb-1">Unit Cost (₱)</label>
                    <input type="number" min="0" value={item.unit_cost}
                      onChange={e => updateItem(i, 'unit_cost', Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:border-teal-400"/>
                  </div>
                  <div className="w-24 pt-5 text-sm font-semibold text-slate-700 text-right">
                    ₱{(Number(item.unit_cost) * Number(item.quantity)).toLocaleString()}
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="pt-5 text-slate-300 hover:text-red-400 font-bold">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals + payment mode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Mode</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400">
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="insurance">Pet Insurance</option>
                  <option value="hmo">HMO</option>
                  <option value="installment">Installment</option>
                </select>
              </div>
              {paymentMode === 'hmo' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">HMO Provider</label>
                  <input value={hmo} onChange={e => setHmo(e.target.value)} placeholder="Maxicare, MediCard…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Discount (%)</label>
                <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 resize-none"
                  placeholder="Insurance claim #, special instructions…"/>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-sm self-start">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Invoice Summary</div>
              {pet && (
                <div className="flex justify-between text-xs text-slate-500 mb-2 pb-2 border-b border-slate-200">
                  <span>Patient</span>
                  <span className="font-semibold text-slate-700">{SPECIES_EMOJI[pet.species] || '🐾'} {pet.name}</span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">₱{subtotal.toLocaleString()}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Discount ({discount}%)</span><span>-₱{discountAmt.toLocaleString()}</span></div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base">
                <span>Total Due</span>
                <span className="text-teal-600">₱{total.toLocaleString()}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">Mode: {paymentMode.replace('_', ' ')}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={save} disabled={loading || !owner || !pet || total <= 0}
            className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Creating Invoice…' : `Create Invoice — ₱${total.toLocaleString()}`}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── OR MODAL ──────────────────────────────────────────────────
function ORModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
        <div className="flex justify-between mb-4">
          <h2 className="text-base font-bold">Official Receipt</h2>
          <button onClick={onClose} className="text-slate-400 text-xl">✕</button>
        </div>
        <div className="font-mono text-xs space-y-1 bg-slate-50 rounded-xl p-4 border border-slate-200" id="print-or">
          <div className="text-center mb-3">
            <div className="text-sm font-bold font-sans">ClinicCore Vet</div>
            <div className="text-slate-500">Smarter Care. Healthier Pets.</div>
            <div className="text-slate-500">{invoice.or_number} · {formatDate(invoice.issued_at)}</div>
          </div>
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
            <div className="flex justify-between"><span>Pet:</span><strong>{(invoice as any).pet?.name || '—'}</strong></div>
            <div className="flex justify-between"><span>Owner:</span><strong>{(invoice as any).owner?.full_name || '—'}</strong></div>
            <div className="flex justify-between"><span>Subtotal:</span><span>{formatPHP(Number(invoice.subtotal))}</span></div>
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount ({invoice.discount_pct}%):</span>
                <span>-{formatPHP(Number(invoice.discount_amount))}</span>
              </div>
            )}
          </div>
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
            <div className="flex justify-between font-bold text-sm"><span>TOTAL DUE:</span><span>{formatPHP(Number(invoice.total_amount))}</span></div>
            <div className="flex justify-between text-emerald-600"><span>Amount Paid:</span><span>{formatPHP(Number(invoice.amount_paid))}</span></div>
            {Number(invoice.balance) > 0 && (
              <div className="flex justify-between text-red-600 font-bold"><span>Balance:</span><span>{formatPHP(Number(invoice.balance))}</span></div>
            )}
          </div>
          <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
            <div className="flex justify-between"><span>Mode:</span><span>{invoice.payment_mode?.replace('_', ' ')}</span></div>
            {invoice.hmo_provider && <div className="flex justify-between"><span>HMO:</span><span>{invoice.hmo_provider}</span></div>}
          </div>
          <div className="text-center text-slate-400 pt-2">Thank you for choosing ClinicCore Vet!</div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => window.print()} className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-teal-700">🖨 Print</button>
          <button onClick={onClose} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  )
}

// ── PAYMENT MODAL ─────────────────────────────────────────────
function PaymentModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [amount, setAmount] = useState(String(invoice.balance))
  const [method, setMethod] = useState('cash')
  const [ref, setRef] = useState('')
  const [loading, setLoading] = useState(false)

  async function save() {
    const n = Number(amount)
    if (!n || n <= 0) { toast.error('Enter a valid amount'); return }
    if (n > Number(invoice.balance)) { toast.error(`Amount exceeds balance of ₱${Number(invoice.balance).toLocaleString()}`); return }

    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { toast.error('Not authenticated'); setLoading(false); return }
    const { data: staff } = await sb.from('staff_profiles').select('clinic_id').eq('id', user.id).single()

    const { error } = await sb.from('payments').insert({
      invoice_id:       invoice.id,
      clinic_id:        staff?.clinic_id,
      amount:           n,
      method,
      reference_number: ref || null,
      received_by:      user.id,
    })

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success(`Payment of ₱${n.toLocaleString()} recorded`)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
        <div className="flex justify-between mb-4">
          <h2 className="text-base font-bold">Record Payment</h2>
          <button onClick={onClose} className="text-slate-400 text-xl">✕</button>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 mb-4 text-sm">
          <div className="font-semibold text-slate-800">{(invoice as any).pet?.name} · {(invoice as any).owner?.full_name}</div>
          <div className="text-slate-500">{invoice.or_number}</div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-500">Outstanding balance:</span>
            <span className="font-bold text-red-600">{formatPHP(Number(invoice.balance))}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (₱)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400">
              {['cash','gcash','bank_transfer','card','insurance','installment'].map(m => (
                <option key={m} value={m}>{m.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reference # (optional)</label>
            <input value={ref} onChange={e => setRef(e.target.value)}
              placeholder="GCash ref, bank ref, check #…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
            {loading ? 'Saving…' : 'Record Payment'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}
