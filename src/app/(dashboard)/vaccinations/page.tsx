import { getCurrentStaff } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VaccinationsView from '@/components/vaccinations/VaccinationsView'

export default async function VaccinationsPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  const supabase = createClient()
  const { data: pets } = await supabase.from('pets').select('*, owner:owners(full_name, contact_number), vaccinations(*)').eq('clinic_id', staff.clinic_id).eq('is_active', true).order('name', { ascending: true })
  return <VaccinationsView initialPets={pets ?? []} />
}
