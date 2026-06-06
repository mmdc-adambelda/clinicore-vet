import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// POST /api/fix-missing-profile
// Called by the register page for users who have an auth account but no staff profile.
// Creates a clinic + staff profile using the admin client (bypasses RLS).
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Check if profile already exists
  const { data: existing } = await admin
    .from('staff_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, message: 'Profile already exists' })
  }

  const body = await request.json().catch(() => ({}))
  const clinicName: string = body.clinicName || 'My Clinic'
  const fullName: string = body.fullName || user.email?.split('@')[0] || 'Clinic Owner'
  const phone: string = body.phone || ''

  // Create clinic
  const { data: clinic, error: clinicErr } = await admin
    .from('clinics')
    .insert({ name: clinicName })
    .select()
    .single()

  if (clinicErr || !clinic) {
    return NextResponse.json({ error: clinicErr?.message || 'Failed to create clinic' }, { status: 500 })
  }

  // Create staff profile
  const { error: staffErr } = await admin
    .from('staff_profiles')
    .insert({ id: user.id, clinic_id: clinic.id, full_name: fullName, email: user.email!, role: 'owner' })

  if (staffErr) {
    await admin.from('clinics').delete().eq('id', clinic.id)
    return NextResponse.json({ error: staffErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, clinicId: clinic.id })
}
