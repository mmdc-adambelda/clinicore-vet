import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()
  const cookieStore = cookies()

  // Collect cookies that signInWithPassword wants to set
  const pending: { name: string; value: string; options: any }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { pending.push(...cookiesToSet) },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  // Write auth cookies onto the JSON response so the browser stores them
  // before the client navigates to /dashboard
  const response = NextResponse.json({ ok: true })
  pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}
