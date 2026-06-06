import { getCurrentStaff } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClinicalIndexView from '@/components/clinical/ClinicalIndexView'

export default async function ClinicalPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  const supabase = createClient()
  const { data: visits } = await supabase.from('clinical_visits')
    .select('*, owner:owners(full_name), pet:pets(name, species), staff:staff_profiles(full_name)')
    .eq('clinic_id', staff.clinic_id)
    .order('created_at', { ascending: false })
    .limit(50)
  return <ClinicalIndexView visits={visits ?? []} />
}
