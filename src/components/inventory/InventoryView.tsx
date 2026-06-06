'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Plus, Package, Pencil, Upload, Download, AlertTriangle, Shield } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  ok:           'bg-emerald-100 text-emerald-700',
  low:          'bg-amber-100 text-amber-700',
  critical:     'bg-red-100 text-red-700',
  out_of_stock: 'bg-red-200 text-red-800 font-bold',
}

const CATEGORIES = [
  'Vaccines','Antibiotics','Anti-parasitic','Pain Management','Controlled Substance',
  'Anesthesia','IV Fluids','Wound Care','Surgical Supplies','Diagnostic Reagents',
  'Topical / Dermatology','Dental Supplies','Ophthalmology','Nutrition / Supplements',
  'Disinfectants','PPE','Office Supplies','Equipment','Other',
]

const UNITS = ['piece','vial','box','bottle','tube','pack','set','syringe','ampule','sachet','kg','L','roll','bag']

const INV_CSV_HEADERS = ['name','category','unit','stock_quantity','reorder_level','unit_cost','supplier','requires_rx','controlled_substance','notes']
const INV_CSV_TEMPLATE = [
  INV_CSV_HEADERS.join(','),
  'Amoxicillin 250mg,Antibiotics,vial,20,5,185.00,VetPharm PH,true,false,Refrigerate',
  'Ketamine 50mg/mL,Controlled Substance,vial,5,2,650.00,MedSupply Corp,true,true,Log each use',
  'Latex Gloves (M),PPE,box,15,5,320.00,MedLine PH,false,false,',
].join('\n')

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += line[i]
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => row[h] = values[i] ?? '')
    return row
  })
}

export default function InventoryView({ items: initial }: { items: any[] }) {
  const router = useRouter()
  const [items, setItems] = useState<any[]>(initial)
  const [category, setCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [controlledOnly, setControlledOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function reload() {
    const sb = createClient()
    const { data } = await sb.from('inventory')
      .select('*').order('name', { ascending: true })
    if (data) setItems(data)
  }

  function downloadTemplate() {
    const blob = new Blob([INV_CSV_TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'inventory_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function importCSV(file: File) {
    setImporting(true)
    const text = await file.text()
    const rows = parseCSV(text)
    if (!rows.length) { toast.error('No valid rows found in CSV'); setImporting(false); return }

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const { data: staff } = await sb.from('staff_profiles').select('clinic_id').eq('id', user!.id).single()

    const payload = rows.map(r => ({
      clinic_id:           staff?.clinic_id,
      name:                r.name?.trim(),
      category:            r.category?.trim() || 'Other',
      unit:                r.unit?.trim() || 'piece',
      stock_quantity:      parseInt(r.stock_quantity) || 0,
      reorder_level:       parseInt(r.reorder_level) || 5,
      unit_cost:           parseFloat(r.unit_cost) || 0,
      supplier:            r.supplier?.trim() || null,
      requires_prescription: r.requires_rx?.trim().toLowerCase() === 'true',
      is_controlled_substance: r.controlled_substance?.trim().toLowerCase() === 'true',
      notes:               r.notes?.trim() || null,
    })).filter(r => r.name)

    const { error } = await sb.from('inventory').upsert(payload, { onConflict: 'clinic_id,name' })
    if (error) { toast.error(error.message); setImporting(false); return }

    toast.success(`Imported ${payload.length} items`)
    reload()
    setImporting(false)
  }

  const filtered = items.filter(it => {
    const matchCat    = category === 'all' || it.category === category
    const matchStatus = statusFilter === 'all' || it.status === statusFilter
    const matchCtrl   = !controlledOnly || it.is_controlled_substance
    const matchSearch = !search || it.name?.toLowerCase().includes(search.toLowerCase()) ||
                        it.supplier?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchStatus && matchCtrl && matchSearch
  })

  const stats = {
    total:    items.length,
    ok:       items.filter(i => i.status === 'ok').length,
    low:      items.filter(i => i.status === 'low').length,
    critical: items.filter(i => ['critical','out_of_stock'].includes(i.status)).length,
    controlled: items.filter(i => i.is_controlled_substance).length,
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          ['Total SKUs',    stats.total,    'text-slate-700', 'bg-white'],
          ['In Stock',      stats.ok,       'text-emerald-700','bg-emerald-50'],
          ['Low / Critical',stats.low + stats.critical, 'text-amber-700','bg-amber-50'],
          ['Controlled',    stats.controlled,'text-red-700', 'bg-red-50'],
        ].map(([l,v,c,bg]) => (
          <div key={l as string} className={cn('border border-slate-200 rounded-xl p-4', bg as string)}>
            <div className="text-xs text-slate-500 font-medium mb-1">{l}</div>
            <div className={cn('text-2xl font-bold', c as string)}>{v}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap items-center">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search item or supplier…"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 w-48"/>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400">
            <option value="all">All Statuses</option>
            <option value="ok">In Stock</option>
            <option value="low">Low</option>
            <option value="critical">Critical</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={controlledOnly} onChange={e => setControlledOnly(e.target.checked)}
              className="accent-red-500"/>
            <span className="text-slate-600 font-medium">Controlled only</span>
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate}
            className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50">
            <Download size={14}/> Template
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-600 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
            <Upload size={14}/> {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => { if (e.target.files?.[0]) importCSV(e.target.files[0]); e.target.value = '' }}/>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700">
            <Plus size={15}/> Add Item
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Item','Category','Stock','Reorder At','Unit Cost','Supplier','Flags','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(it => (
              <tr key={it.id} className={cn('border-b border-slate-100 hover:bg-slate-50 group',
                it.is_controlled_substance ? 'bg-red-50/40' : '')}>
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{it.name}</div>
                  <div className="text-xs text-slate-400">{it.unit}</div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{it.category}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-sm font-bold',
                    it.stock_quantity === 0 ? 'text-red-600' :
                    it.stock_quantity <= it.reorder_level ? 'text-amber-600' : 'text-slate-900')}>
                    {it.stock_quantity}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">{it.reorder_level}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-700">₱{Number(it.unit_cost).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{it.supplier || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {it.is_controlled_substance && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                        <Shield size={9}/> CTRL
                      </span>
                    )}
                    {it.requires_prescription && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                        Rx
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLE[it.status] || 'bg-slate-100 text-slate-600')}>
                    {it.status?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setEditItem(it)}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-600 border border-teal-200 px-2 py-1 rounded-lg hover:bg-teal-50">
                    <Pencil size={11}/> Edit
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="text-center py-16 text-slate-400">
                <Package size={36} className="mx-auto mb-3 text-slate-300"/>
                <p className="text-sm font-medium">No inventory items found.</p>
                <button onClick={() => setShowAdd(true)} className="mt-3 text-xs font-semibold text-teal-600 hover:underline">
                  Add the first item →
                </button>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <ItemModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); reload() }}
        />
      )}
      {editItem && (
        <ItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { setEditItem(null); reload() }}
        />
      )}
    </div>
  )
}

// ── ADD / EDIT MODAL ──────────────────────────────────────────
function ItemModal({ item, onClose, onSaved }: { item?: any; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name:                    item?.name || '',
    category:                item?.category || 'Other',
    unit:                    item?.unit || 'piece',
    stock_quantity:          String(item?.stock_quantity ?? '0'),
    reorder_level:           String(item?.reorder_level ?? '5'),
    unit_cost:               String(item?.unit_cost ?? '0'),
    supplier:                item?.supplier || '',
    requires_prescription:   item?.requires_prescription ?? false,
    is_controlled_substance: item?.is_controlled_substance ?? false,
    notes:                   item?.notes || '',
  })

  function set(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!form.name.trim()) { toast.error('Item name is required'); return }
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    const { data: staff } = await sb.from('staff_profiles').select('clinic_id').eq('id', user!.id).single()

    const payload: any = {
      clinic_id:               staff?.clinic_id,
      name:                    form.name.trim(),
      category:                form.category,
      unit:                    form.unit,
      stock_quantity:          parseInt(form.stock_quantity) || 0,
      reorder_level:           parseInt(form.reorder_level) || 5,
      unit_cost:               parseFloat(form.unit_cost) || 0,
      supplier:                form.supplier || null,
      requires_prescription:   form.requires_prescription,
      is_controlled_substance: form.is_controlled_substance,
      notes:                   form.notes || null,
    }

    let error
    if (item?.id) {
      ({ error } = await sb.from('inventory').update(payload).eq('id', item.id))
    } else {
      ({ error } = await sb.from('inventory').insert(payload))
    }

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success(item ? 'Item updated' : 'Item added')
    setLoading(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">{item ? 'Edit Item' : 'Add Inventory Item'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. Amoxicillin 250mg"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Stock Quantity</label>
              <input type="number" min="0" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reorder Level</label>
              <input type="number" min="0" value={form.reorder_level} onChange={e => set('reorder_level', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Cost (₱)</label>
              <input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier</label>
              <input value={form.supplier} onChange={e => set('supplier', e.target.value)}
                placeholder="Supplier name"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                placeholder="Storage instructions, expiry notes, etc."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 resize-none"/>
            </div>
          </div>

          {/* Flags */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Regulatory Flags</div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.requires_prescription}
                onChange={e => set('requires_prescription', e.target.checked)}
                className="accent-amber-500 w-4 h-4"/>
              <div>
                <div className="text-sm font-semibold text-slate-700">Requires Prescription (Rx)</div>
                <div className="text-xs text-slate-400">Cannot be dispensed without a valid veterinary prescription</div>
              </div>
            </label>
            <label className={cn('flex items-center gap-3 cursor-pointer p-2 rounded-lg',
              form.is_controlled_substance ? 'bg-red-50 border border-red-200' : '')}>
              <input type="checkbox" checked={form.is_controlled_substance}
                onChange={e => set('is_controlled_substance', e.target.checked)}
                className="accent-red-500 w-4 h-4"/>
              <div>
                <div className="text-sm font-semibold text-red-700 flex items-center gap-1">
                  <Shield size={13}/> Controlled Substance
                </div>
                <div className="text-xs text-slate-400">Subject to strict logging, DEA/FDA requirements apply</div>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={save} disabled={loading}
            className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
            {loading ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  )
}
