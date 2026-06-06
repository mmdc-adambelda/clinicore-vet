import { getCurrentStaff } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OwnersView from '@/components/owners/OwnersView'

export default async function OwnersPage() {
  const staff = await getCurrentStaff()
  if (!staff) redirect('/login')
  const supabase = createClient()
  const { data: owners } = await supabase.from('owners').select('*, pets(*)').eq('clinic_id', staff.clinic_id).eq('is_active', true).order('created_at', { ascending: false }).limit(50)
  return <OwnersView initialOwners={owners ?? []} />
}
