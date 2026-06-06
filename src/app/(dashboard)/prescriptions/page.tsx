import { getCurrentStaff } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PrescriptionsView from '@/components/prescriptions/PrescriptionsView'

export default async function PrescriptionsPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  const supabase = createClient()
  const { data: prescriptions } = await supabase.from('prescriptions').select('*, pet:pets(name, species, owner:owners(full_name))').eq('clinic_id', staff.clinic_id).order('created_at', { ascending: false }).limit(50)
  return <PrescriptionsView initialPrescriptions={prescriptions ?? []} />
}
