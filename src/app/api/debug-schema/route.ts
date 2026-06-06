import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const admin = createAdminClient()

  // Try minimal inserts to figure out what columns exist
  const tests: Record<string, unknown> = {}

  // Test clinics columns
  const clinicInsert = { name: 'TEST_DELETE_ME_' + Date.now() }
  const { data: clinic, error: c1 } = await admin.from('clinics').insert(clinicInsert).select().single()
  tests.clinic_basic = c1 ? c1.message : `ok, id=${clinic?.id}`

  if (clinic) {
    // Test staff_profiles columns (minimal)
    const sp1 = await admin.from('staff_profiles').insert({
      id: '00000000-0000-0000-0000-000000000001',
      clinic_id: clinic.id,
      full_name: 'TEST',
      role: 'owner',
    }).select()
    tests.staff_no_email = sp1.error ? sp1.error.message : 'ok'

    // Try with email
    const sp2 = await admin.from('staff_profiles').insert({
      id: '00000000-0000-0000-0000-000000000002',
      clinic_id: clinic.id,
      full_name: 'TEST',
      email: 'test@test.com',
      role: 'owner',
    }).select()
    tests.staff_with_email = sp2.error ? sp2.error.message : 'ok'

    // Clean up
    await admin.from('clinics').delete().eq('id', clinic.id)
  }

  // Check what columns exist via a select
  const { data: clinicRow } = await admin.from('clinics').select('*').limit(1)
  tests.clinic_columns = clinicRow?.[0] ? Object.keys(clinicRow[0]) : 'no rows'

  const { data: staffRow } = await admin.from('staff_profiles').select('*').limit(1)
  tests.staff_columns = staffRow?.[0] ? Object.keys(staffRow[0]) : 'no rows'

  return NextResponse.json(tests)
}
