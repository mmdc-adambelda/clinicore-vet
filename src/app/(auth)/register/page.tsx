import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RegisterForm from '@/components/auth/RegisterForm'
import CompleteSetupForm from '@/components/auth/CompleteSetupForm'

export const metadata: Metadata = { title: 'Create Account' }

export default async function RegisterPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Check if profile already exists
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (staff) redirect('/dashboard')
    // Authenticated but no profile → complete setup
    return <CompleteSetupForm email={user.email ?? ''} />
  }

  return <RegisterForm />
}
