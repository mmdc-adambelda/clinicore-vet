import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Login' }

interface LoginPageProps {
  searchParams: { error?: string }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Check if they have a staff profile before sending to dashboard
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (staff) redirect('/dashboard')
    // Authenticated but no profile → they need to complete registration
    redirect('/register')
  }

  return <LoginForm error={searchParams.error} />
}
