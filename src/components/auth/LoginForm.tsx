'use client'
import { useFormStatus } from 'react-dom'
import { loginAction } from '@/app/(auth)/login/actions'
import Link from 'next/link'
import Image from 'next/image'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
    >
      {pending ? 'Signing in…' : 'Sign in to ClinicCore'}
    </button>
  )
}

interface LoginFormProps {
  error?: string
}

export default function LoginForm({ error }: LoginFormProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 bg-white">
          <Image src="/logo.png" alt="ClinicCore Vet" width={64} height={64} className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white">ClinicCore Vet</h1>
        <p className="text-slate-400 text-sm mt-1">Veterinary Practice Management</p>
      </div>

      <form action={loginAction} className="space-y-4">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="doctor@clinic.com"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition-all text-sm"
          />
        </div>

        <SubmitButton />
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        New clinic?{' '}
        <Link href="/register" className="text-blue-400 hover:text-blue-300">Create account</Link>
      </p>
    </div>
  )
}
