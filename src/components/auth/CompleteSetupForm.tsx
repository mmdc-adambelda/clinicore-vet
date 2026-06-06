'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface Props {
  email: string
}

export default function CompleteSetupForm({ email }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ full_name: '', clinic_name: '', phone: '' })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/fix-missing-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: form.full_name,
        clinicName: form.clinic_name,
        phone: form.phone,
      }),
    })

    if (!res.ok) {
      const body = await res.json()
      toast.error(body.error || 'Setup failed')
      setLoading(false)
      return
    }

    toast.success('Setup complete! Welcome to ClinicCore Vet.')
    router.push('/dashboard')
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-8">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-xl overflow-hidden mx-auto mb-3 bg-white">
          <Image src="/logo.png" alt="ClinicCore Vet" width={56} height={56} className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl font-bold text-white">Complete Your Setup</h1>
        <p className="text-slate-400 text-xs mt-1">Logged in as {email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { k: 'full_name',   label: 'Your full name',          ph: 'Dr. Juan dela Cruz', type: 'text' },
          { k: 'clinic_name', label: 'Clinic / Practice name',  ph: 'ClinicCore Vet',     type: 'text' },
          { k: 'phone',       label: 'Clinic phone (optional)', ph: '+63 2 8888 0000',    type: 'tel' },
        ].map(({ k, label, ph, type }) => (
          <div key={k}>
            <label className="block text-xs font-medium text-slate-300 mb-1">{label}</label>
            <input
              type={type}
              value={form[k as keyof typeof form]}
              onChange={set(k)}
              required={k !== 'phone'}
              placeholder={ph}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder:text-slate-500 outline-none focus:border-blue-400 text-sm transition-all"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mt-2"
        >
          {loading ? 'Setting up…' : 'Complete Setup & Enter Dashboard'}
        </button>
      </form>
    </div>
  )
}
