import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cookies = req.cookies.getAll()
  const authCookie = cookies.find(c => c.name.includes('auth-token'))

  let userResult: any = null
  let userError: any = null

  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getUser()
    userResult = data?.user ? { id: data.user.id, email: data.user.email } : null
    userError = error ? { message: error.message, status: error.status } : null
  } catch (e: any) {
    userError = { thrown: e?.message }
  }

  return NextResponse.json({
    cookiesReceived: cookies.map(c => ({ name: c.name, valueLen: c.value.length, valueStart: c.value.substring(0, 30) })),
    authCookieFound: !!authCookie,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    user: userResult,
    error: userError,
  })
}
