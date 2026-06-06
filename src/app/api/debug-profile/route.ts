import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Use admin client to bypass RLS and check what actually exists
  const { data: staffAdmin, error: staffErr } = await admin
    .from('staff_profiles')
    .select('*, clinic:clinics(*)')
    .eq('id', user.id)
    .maybeSingle()

  // Also try with regular client (subject to RLS)
  const { data: staffUser, error: staffUserErr } = await supabase
    .from('staff_profiles')
    .select('id, clinic_id, full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    staffViaAdmin: staffAdmin,
    staffViaUser: staffUser,
    adminError: staffErr?.message,
    userError: staffUserErr?.message,
  })
}
