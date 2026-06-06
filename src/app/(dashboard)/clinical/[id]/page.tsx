import { getCurrentStaff } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ClinicalWorkflowView from '@/components/clinical/ClinicalWorkflowView'

export default async function ClinicalVisitPage({ params }: { params: { id: string } }) {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  const supabase = createClient()
  const { data: visit } = await supabase.from('clinical_visits')
    .select('*, owner:owners(*), pet:pets(*), staff:staff_profiles(full_name, role)')
    .eq('id', params.id).single()
  if (!visit) notFound()
  return <ClinicalWorkflowView visit={visit} />
}
