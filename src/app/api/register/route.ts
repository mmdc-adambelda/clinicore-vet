import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId, email, fullName, clinicName, phone } = await req.json()

  if (!userId || !email || !fullName || !clinicName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: clinic, error: clinicErr } = await supabase
    .from('clinics')
    .insert({ name: clinicName })
    .select()
    .single()

  if (clinicErr || !clinic) {
    return NextResponse.json({ error: clinicErr?.message || 'Failed to create clinic' }, { status: 500 })
  }

  const { error: staffErr } = await supabase
    .from('staff_profiles')
    .insert({ id: userId, clinic_id: clinic.id, full_name: fullName, email, role: 'owner' })

  if (staffErr) {
    // Roll back the clinic we just created
    await supabase.from('clinics').delete().eq('id', clinic.id)
    return NextResponse.json({ error: staffErr.message }, { status: 500 })
  }

  return NextResponse.json({ clinicId: clinic.id })
}
