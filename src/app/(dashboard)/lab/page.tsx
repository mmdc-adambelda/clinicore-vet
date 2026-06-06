import { getCurrentStaff } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LabView from '@/components/lab/LabView'

export default async function LabPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  const supabase = createClient()
  const { data: results } = await supabase.from('lab_results').select('*, pet:pets(name, species, owner:owners(full_name))').eq('clinic_id', staff.clinic_id).order('created_at', { ascending: false }).limit(50)
  return <LabView initialResults={results ?? []} />
}
