import { getCurrentStaff } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppointmentsView from '@/components/appointments/AppointmentsView'

export default async function AppointmentsPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  const today = new Date().toISOString().split('T')[0]
  const supabase = createClient()
  const { data: appointments } = await supabase.from('appointments')
    .select('*, owner:owners(full_name, contact_number), pet:pets(name, species, breed), staff:staff_profiles(full_name, role)')
    .eq('clinic_id', staff.clinic_id)
    .gte('scheduled_at', today + 'T00:00:00')
    .lte('scheduled_at', today + 'T23:59:59')
    .order('scheduled_at', { ascending: true })
  return <AppointmentsView initialAppointments={appointments ?? []} />
}
