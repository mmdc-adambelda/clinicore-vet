'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await res.json()
    if (!res.ok) {
      toast.error(body.error || 'Sign in failed')
      setLoading(false)
      return
    }
    // Cookies are now set in the browser (arrived in the fetch response).
    // Hard-navigate so the middleware reads the fresh session.
    window.location.href = '/dashboard'
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4 bg-white">
          <Image src="/logo.png" alt="CliniCore" width={64} height={64} className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-white">CliniCore EMR</h1>
        <p className="text-slate-400 text-sm mt-1">Dental Practice Management</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            required autoComplete="email"
            placeholder="doctor@clinic.com"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            required autoComplete="current-password"
            placeholder="••••••••"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition-all text-sm"
          />
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
        >
          {loading ? 'Signing in…' : 'Sign in to CliniCore'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        New clinic?{' '}
        <Link href="/register" className="text-blue-400 hover:text-blue-300">Create account</Link>
      </p>
    </div>
  )
}
