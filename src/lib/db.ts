// src/lib/db.ts — ClinicCore Vet data access layer
import { createClient } from '@/lib/supabase/server'
import type { AuditLog, InventoryItem, Invoice, StaffProfile } from '@/types'

export async function logAudit(action: string, resourceType: string, resourceId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profile } = await supabase.from('staff_profiles').select('full_name, clinic_id').eq('id', user.id).single()
  if (!profile) return
  await supabase.from('audit_logs').insert({
    clinic_id: profile.clinic_id, user_id: user.id,
    user_name: profile.full_name, action,
    resource_type: resourceType, resource_id: resourceId || null,
  })
}

export async function getCurrentStaff(): Promise<StaffProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('staff_profiles').select('*, clinic:clinics(*)').eq('id', user.id).single()
  return data
}

export async function getDashboardStats() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return getEmptyStats()
  const { data: profile } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
  if (!profile) return getEmptyStats()
  const clinicId = profile.clinic_id

  const now = new Date()
  const y = now.getFullYear(), mo = now.getMonth(), d = now.getDate()
  const dayStart   = new Date(y, mo, d, 0, 0, 0).toISOString()
  const dayEnd     = new Date(y, mo, d, 23, 59, 59, 999).toISOString()
  const monthStart = new Date(y, mo, 1).toISOString()
  const soonDate   = new Date(); soonDate.setDate(now.getDate() + 14)
  const soonISO    = soonDate.toISOString().split('T')[0]
  const todayISO   = now.toISOString().split('T')[0]

  const [
    apptTodayRes, activePetsRes, activeOwnersRes, newPetsRes,
    todayPayRes, pendingInvRes, weeklyPayRes, scheduleRes,
    inventoryRes, vaccOverdueRes, vaccDueSoonRes,
    cancelledRes, totalMonthRes, speciesRes,
  ] = await Promise.all([
    supabase.from('appointments').select('*', { count:'exact', head:true })
      .eq('clinic_id', clinicId).gte('scheduled_at', dayStart).lte('scheduled_at', dayEnd),
    supabase.from('pets').select('*', { count:'exact', head:true })
      .eq('clinic_id', clinicId).eq('is_active', true),
    supabase.from('owners').select('*', { count:'exact', head:true })
      .eq('clinic_id', clinicId).eq('is_active', true),
    supabase.from('pets').select('*', { count:'exact', head:true })
      .eq('clinic_id', clinicId).gte('created_at', monthStart),
    supabase.from('payments').select('amount')
      .eq('clinic_id', clinicId).gte('created_at', dayStart).lte('created_at', dayEnd),
    supabase.from('invoices').select('balance')
      .eq('clinic_id', clinicId).in('status', ['issued','partial','overdue']),
    supabase.from('payments').select('amount, created_at')
      .eq('clinic_id', clinicId).gte('created_at', new Date(y, mo, d - 6).toISOString()),
    supabase.from('appointments')
      .select('*, pet:pets(name, species), owner:owners(full_name)')
      .eq('clinic_id', clinicId).gte('scheduled_at', dayStart).lte('scheduled_at', dayEnd)
      .order('scheduled_at', { ascending: true }).limit(8),
    supabase.from('inventory').select('id, name, status, stock_quantity, unit')
      .eq('clinic_id', clinicId).in('status', ['low','critical','out_of_stock']).limit(5),
    supabase.from('vaccinations').select('*', { count:'exact', head:true })
      .eq('clinic_id', clinicId).lt('next_due_date', todayISO),
    supabase.from('vaccinations').select('*', { count:'exact', head:true })
      .eq('clinic_id', clinicId).gte('next_due_date', todayISO).lte('next_due_date', soonISO),
    supabase.from('appointments').select('*', { count:'exact', head:true })
      .eq('clinic_id', clinicId).eq('status', 'cancelled').gte('scheduled_at', monthStart),
    supabase.from('appointments').select('*', { count:'exact', head:true })
      .eq('clinic_id', clinicId).gte('scheduled_at', monthStart),
    supabase.from('pets').select('species').eq('clinic_id', clinicId).eq('is_active', true),
  ])

  const today_revenue   = (todayPayRes.data ?? []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
  const pending_balance = (pendingInvRes.data ?? []).reduce((sum: number, i: any) => sum + Number(i.balance), 0)

  // Build weekly revenue buckets
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const weekly_revenue: { day: string; amount: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(y, mo, d - i)
    const ds = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate(), 0, 0, 0).toISOString()
    const de = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate(), 23, 59, 59, 999).toISOString()
    const amount = (weeklyPayRes.data ?? [])
      .filter((p: any) => p.created_at >= ds && p.created_at <= de)
      .reduce((s: number, p: any) => s + Number(p.amount), 0)
    weekly_revenue.push({ day: DAYS[dd.getDay()], amount })
  }

  // Species breakdown
  const speciesCounts: Record<string, number> = {}
  ;(speciesRes.data ?? []).forEach((p: any) => {
    speciesCounts[p.species] = (speciesCounts[p.species] || 0) + 1
  })
  const species_breakdown = Object.entries(speciesCounts)
    .map(([species, count]) => ({ species, count }))
    .sort((a, b) => b.count - a.count).slice(0, 6)

  const totalMonth       = totalMonthRes.count ?? 0
  const cancelledCount   = cancelledRes.count ?? 0
  const cancellation_rate = totalMonth > 0 ? Math.round((cancelledCount / totalMonth) * 100) : 0

  return {
    today_appointments:    apptTodayRes.count ?? 0,
    today_revenue,
    active_pets:           activePetsRes.count ?? 0,
    active_owners:         activeOwnersRes.count ?? 0,
    pending_balance,
    new_pets_month:        newPetsRes.count ?? 0,
    cancellation_rate,
    vaccination_overdue:   vaccOverdueRes.count ?? 0,
    vaccination_due_soon:  vaccDueSoonRes.count ?? 0,
    weekly_revenue,
    species_breakdown,
    today_schedule:        scheduleRes.data ?? [],
    inventory_alerts:      inventoryRes.data ?? [],
  }
}

export async function getInvoices(): Promise<{ data: Invoice[] }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [] }
  const { data: profile } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
  if (!profile) return { data: [] }
  const { data } = await supabase.from('invoices')
    .select('*, owner:owners(full_name), pet:pets(name, species)')
    .eq('clinic_id', profile.clinic_id)
    .order('created_at', { ascending: false })
  return { data: (data ?? []) as Invoice[] }
}

export async function getInventory(): Promise<{ data: InventoryItem[] }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [] }
  const { data: profile } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
  if (!profile) return { data: [] }
  const { data } = await supabase.from('inventory')
    .select('*')
    .eq('clinic_id', profile.clinic_id)
    .order('name', { ascending: true })
  return { data: (data ?? []) as InventoryItem[] }
}

export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data: profile } = await supabase.from('staff_profiles').select('clinic_id').eq('id', user.id).single()
  if (!profile) return []
  const { data } = await supabase.from('audit_logs')
    .select('*')
    .eq('clinic_id', profile.clinic_id)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as AuditLog[]
}

function getEmptyStats() {
  return {
    today_appointments: 0, today_revenue: 0, active_pets: 0, active_owners: 0,
    pending_balance: 0, new_pets_month: 0, cancellation_rate: 0,
    vaccination_overdue: 0, vaccination_due_soon: 0,
    weekly_revenue: [], species_breakdown: [],
    today_schedule: [], inventory_alerts: [],
  }
}
