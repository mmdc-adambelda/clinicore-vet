'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, PawPrint, Phone, Mail, ChevronRight, Edit, Syringe, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const SPECIES_OPTIONS = ['dog','cat','bird','rabbit','hamster','guinea_pig','reptile','fish','other']
const SEX_OPTIONS = ['male','female','male_neutered','female_spayed','unknown']
const SPECIES_EMOJI: Record<string, string> = {
  dog:'🐕', cat:'🐈', bird:'🐦', rabbit:'🐇', hamster:'🐹',
  reptile:'🦎', fish:'🐠', guinea_pig:'🐾', other:'🐾'
}
const VACC_BADGE: Record<string, string> = {
  up_to_date: 'bg-emerald-100 text-emerald-700',
  due_soon:   'bg-amber-100 text-amber-700',
  overdue:    'bg-red-100 text-red-700',
}

const EMPTY_OWNER = { full_name:'', contact_number:'', email:'', address:'', emergency_contact_name:'', emergency_contact_phone:'', notes:'' }
const EMPTY_PET = { name:'', species:'dog', breed:'', date_of_birth:'', sex:'male', weight_kg:'', color:'', microchip_number:'', known_allergies:'', notes:'' }

export default function OwnersView({ initialOwners }: { initialOwners: any[] }) {
  const [owners, setOwners] = useState(initialOwners)
  const [query, setQuery] = useState('')
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [showPetModal, setShowPetModal] = useState(false)
  const [editOwner, setEditOwner] = useState<any>(null)
  const [editPet, setEditPet] = useState<any>(null)
  const [selectedOwner, setSelectedOwner] = useState<any>(null)
  const [petOwner, setPetOwner] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [ownerForm, setOwnerForm] = useState({ ...EMPTY_OWNER })
  const [petForm, setPetForm] = useState({ ...EMPTY_PET })

  const supabase = createClient()

  const loadOwners = useCallback(async (q = '') => {
    let qb = supabase.from('owners')
      .select('*, pets(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(50)
    if (q) qb = qb.ilike('full_name', `%${q}%`)
    const { data } = await qb
    if (data) setOwners(data)
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => loadOwners(query), 300)
    return () => clearTimeout(t)
  }, [query, loadOwners])

  function openOwnerModal(owner?: any) {
    if (owner) {
      setEditOwner(owner)
      setOwnerForm({
        full_name: owner.full_name || '',
        contact_number: owner.contact_number || '',
        email: owner.email || '',
        address: owner.address || '',
        emergency_contact_name: owner.emergency_contact_name || '',
        emergency_contact_phone: owner.emergency_contact_phone || '',
        notes: owner.notes || '',
      })
    } else {
      setEditOwner(null)
      setOwnerForm({ ...EMPTY_OWNER })
    }
    setShowOwnerModal(true)
  }

  function openPetModal(owner: any, pet?: any) {
    setPetOwner(owner)
    if (pet) {
      setEditPet(pet)
      setPetForm({
        name: pet.name || '',
        species: pet.species || 'dog',
        breed: pet.breed || '',
        date_of_birth: pet.date_of_birth || '',
        sex: pet.sex || 'male',
        weight_kg: pet.weight_kg ? String(pet.weight_kg) : '',
        color: pet.color || '',
        microchip_number: pet.microchip_number || '',
        known_allergies: pet.known_allergies || '',
        notes: pet.notes || '',
      })
    } else {
      setEditPet(null)
      setPetForm({ ...EMPTY_PET })
    }
    setShowPetModal(true)
  }

  async function saveOwner() {
    if (!ownerForm.full_name.trim()) { toast.error('Full name is required'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user!.id).single()
    const payload = { ...ownerForm, clinic_id: profile!.clinic_id }
    if (editOwner) {
      const { error } = await supabase.from('owners').update(payload).eq('id', editOwner.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Owner updated')
    } else {
      const { error } = await supabase.from('owners').insert(payload)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Owner registered')
    }
    setShowOwnerModal(false)
    await loadOwners(query)
    setLoading(false)
  }

  async function savePet() {
    if (!petForm.name.trim()) { toast.error('Pet name is required'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user!.id).single()
    const payload = {
      name: petForm.name,
      species: petForm.species,
      breed: petForm.breed || null,
      date_of_birth: petForm.date_of_birth || null,
      sex: petForm.sex,
      weight_kg: petForm.weight_kg ? parseFloat(petForm.weight_kg) : null,
      color: petForm.color || null,
      microchip_number: petForm.microchip_number || null,
      known_allergies: petForm.known_allergies || null,
      notes: petForm.notes || null,
      owner_id: petOwner.id,
      clinic_id: profile!.clinic_id,
    }
    if (editPet) {
      const { error } = await supabase.from('pets').update(payload).eq('id', editPet.id)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Pet updated')
    } else {
      const { error } = await supabase.from('pets').insert(payload)
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Pet registered')
    }
    setShowPetModal(false)
    await loadOwners(query)
    setLoading(false)
  }

  const filteredOwners = owners

  return (
    <div className="flex gap-5 h-[calc(100vh-120px)]">
      {/* Left panel — Owner list */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:border-teal-400">
            <Search size={13} className="text-slate-400" />
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search owners…"
              className="flex-1 outline-none text-sm placeholder:text-slate-400"
            />
          </div>
          <button onClick={() => openOwnerModal()}
            className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 whitespace-nowrap flex items-center gap-1">
            <Plus size={14} /> Owner
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredOwners.map(owner => (
            <div key={owner.id}
              onClick={() => setSelectedOwner(owner)}
              className={cn('bg-white border rounded-xl p-3 cursor-pointer transition-all hover:border-teal-300',
                selectedOwner?.id === owner.id ? 'border-teal-400 shadow-sm ring-1 ring-teal-200' : 'border-slate-200')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                    {owner.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-slate-800 truncate">{owner.full_name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{owner.contact_number || owner.email || 'No contact'}</div>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-300 flex-shrink-0 mt-1" />
              </div>
              {owner.pets && owner.pets.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-2">
                  {owner.pets.map((p: any) => (
                    <span key={p.id} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">
                      {SPECIES_EMOJI[p.species] || '🐾'} {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredOwners.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <User size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No owners found</p>
              <button onClick={() => openOwnerModal()} className="text-xs text-teal-600 font-semibold mt-1 hover:underline">
                Register first owner →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — Owner detail */}
      <div className="flex-1 overflow-y-auto">
        {!selectedOwner ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <PawPrint size={40} className="mb-3 text-slate-200" />
            <p className="text-sm font-medium">Select an owner to view details</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Owner card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">
                    {selectedOwner.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedOwner.full_name}</h2>
                    <div className="flex gap-3 mt-1">
                      {selectedOwner.contact_number && (
                        <span className="flex items-center gap-1 text-xs text-slate-500"><Phone size={11}/>{selectedOwner.contact_number}</span>
                      )}
                      {selectedOwner.email && (
                        <span className="flex items-center gap-1 text-xs text-slate-500"><Mail size={11}/>{selectedOwner.email}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => openOwnerModal(selectedOwner)}
                  className="flex items-center gap-1 text-xs font-semibold text-teal-600 border border-teal-200 px-2.5 py-1.5 rounded-lg hover:bg-teal-50">
                  <Edit size={12}/> Edit
                </button>
              </div>
              {selectedOwner.address && (
                <p className="text-xs text-slate-400 mt-3">📍 {selectedOwner.address}</p>
              )}
              {selectedOwner.emergency_contact_name && (
                <p className="text-xs text-slate-400 mt-1">🆘 Emergency: {selectedOwner.emergency_contact_name} {selectedOwner.emergency_contact_phone && `· ${selectedOwner.emergency_contact_phone}`}</p>
              )}
            </div>

            {/* Pets section */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Pets ({selectedOwner.pets?.length || 0})</h3>
                <button onClick={() => openPetModal(selectedOwner)}
                  className="flex items-center gap-1 text-xs font-semibold text-teal-600 border border-teal-200 px-2.5 py-1.5 rounded-lg hover:bg-teal-50">
                  <Plus size={12}/> Add Pet
                </button>
              </div>
              <div className="space-y-3">
                {(selectedOwner.pets || []).map((pet: any) => (
                  <div key={pet.id} className="flex items-start justify-between border border-slate-100 rounded-xl p-3 hover:border-slate-200 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{SPECIES_EMOJI[pet.species] || '🐾'}</span>
                      <div>
                        <div className="text-[14px] font-bold text-slate-800">{pet.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {[pet.species, pet.breed, pet.sex?.replace('_',' ')].filter(Boolean).join(' · ')}
                        </div>
                        {pet.date_of_birth && (
                          <div className="text-[11px] text-slate-400">DOB: {pet.date_of_birth}</div>
                        )}
                        {pet.microchip_number && (
                          <div className="text-[11px] text-slate-400">🔖 Microchip: {pet.microchip_number}</div>
                        )}
                        {pet.known_allergies && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-red-600 bg-red-50 rounded-lg px-2 py-0.5 w-fit">
                            ⚠️ Allergies: {pet.known_allergies}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => openPetModal(selectedOwner, pet)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-500 border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50 whitespace-nowrap">
                      <Edit size={11}/> Edit
                    </button>
                  </div>
                ))}
                {(!selectedOwner.pets || selectedOwner.pets.length === 0) && (
                  <div className="text-center py-8 text-slate-400">
                    <PawPrint size={24} className="mx-auto mb-2 text-slate-200"/>
                    <p className="text-sm">No pets registered yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Owner Modal */}
      {showOwnerModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowOwnerModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">{editOwner ? 'Edit Owner' : 'Register Owner'}</h2>
              <button onClick={() => setShowOwnerModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              {[
                ['Full Name *', 'full_name', 'text', 'Juan dela Cruz'],
                ['Contact Number', 'contact_number', 'tel', '09XX-XXX-XXXX'],
                ['Email', 'email', 'email', 'juan@example.com'],
                ['Address', 'address', 'text', 'City, Province'],
                ['Emergency Contact Name', 'emergency_contact_name', 'text', 'Maria dela Cruz'],
                ['Emergency Contact Phone', 'emergency_contact_phone', 'tel', '09XX-XXX-XXXX'],
              ].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(ownerForm as any)[key]}
                    onChange={e => setOwnerForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea
                  value={ownerForm.notes}
                  onChange={e => setOwnerForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveOwner} disabled={loading}
                className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
                {loading ? 'Saving…' : editOwner ? 'Save Changes' : 'Register Owner'}
              </button>
              <button onClick={() => setShowOwnerModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Pet Modal */}
      {showPetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={e => e.target === e.currentTarget && setShowPetModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {editPet ? 'Edit Pet' : `Register Pet for ${petOwner?.full_name}`}
              </h2>
              <button onClick={() => setShowPetModal(false)} className="text-slate-400 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pet Name *</label>
                <input value={petForm.name} onChange={e => setPetForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Buddy, Luna, Mochi…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Species</label>
                  <select value={petForm.species} onChange={e => setPetForm(f => ({ ...f, species: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 bg-white capitalize">
                    {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sex</label>
                  <select value={petForm.sex} onChange={e => setPetForm(f => ({ ...f, sex: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 bg-white">
                    {SEX_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              {[
                ['Breed', 'breed', 'text', 'Aspin, Puspin, Labrador…'],
                ['Color / Markings', 'color', 'text', 'Black and white…'],
                ['Date of Birth', 'date_of_birth', 'date', ''],
                ['Weight (kg)', 'weight_kg', 'number', '5.2'],
                ['Microchip Number', 'microchip_number', 'text', '985XXXXXXXXXXXXXX'],
              ].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                  <input type={type} value={(petForm as any)[key]}
                    onChange={e => setPetForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"
                    step={type === 'number' ? '0.01' : undefined}/>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Known Allergies</label>
                <input value={petForm.known_allergies} onChange={e => setPetForm(f => ({ ...f, known_allergies: e.target.value }))}
                  placeholder="Penicillin, chicken protein…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea value={petForm.notes} onChange={e => setPetForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 resize-none"/>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={savePet} disabled={loading || !petForm.name}
                className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-60">
                {loading ? 'Saving…' : editPet ? 'Save Changes' : 'Register Pet'}
              </button>
              <button onClick={() => setShowPetModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
