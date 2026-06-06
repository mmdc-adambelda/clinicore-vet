'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, Calendar, Users, Stethoscope,
  Syringe, CreditCard, Package, Heart,
  BarChart3, Settings, LogOut, PawPrint, ClipboardList,
  FlaskConical, AlertTriangle
} from 'lucide-react'
import type { StaffProfile } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const NAV = [
  { group: 'Overview', items: [
    { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/appointments', icon: Calendar,         label: 'Appointments' },
    { href: '/owners',       icon: Users,            label: 'Owners & Pets' },
    { href: '/clinical',     icon: Stethoscope,      label: 'Clinical Workflow' },
  ]},
  { group: 'Veterinary', items: [
    { href: '/vaccinations', icon: Syringe,          label: 'Vaccinations' },
    { href: '/prescriptions',icon: ClipboardList,    label: 'Prescriptions' },
    { href: '/lab',          icon: FlaskConical,     label: 'Lab & Diagnostics' },
  ]},
  { group: 'Operations', items: [
    { href: '/billing',      icon: CreditCard,       label: 'Billing' },
    { href: '/inventory',    icon: Package,          label: 'Inventory' },
    { href: '/reports',      icon: BarChart3,        label: 'Reports & KPIs' },
    { href: '/settings',     icon: Settings,         label: 'Settings / RBAC' },
  ]},
]

interface Props { staff: StaffProfile }

export default function Sidebar({ staff }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
  }

  function isActive(href: string, exact = true) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const initials = staff.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const roleLabel = staff.role.replace(/_/g, ' ')

  return (
    <aside className="w-[230px] flex-shrink-0 flex flex-col overflow-hidden" style={{ background: '#0d2137' }}>
      {/* Logo */}
      <div className="h-[68px] flex items-center gap-3 px-4 border-b border-white/8 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white p-1">
          <Image src="/logo.png" alt="ClinicCore Vet" width={40} height={40} className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="text-[14px] font-bold leading-none text-white">ClinicCore</div>
          <div className="text-[11px] font-semibold mt-0.5" style={{ color: '#4fc3a1' }}>VET</div>
          <div className="text-[9px] text-slate-500 tracking-wide">v1.0</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-white/10">
        {NAV.map(({ group, items }) => (
          <div key={group} className="mb-1">
            <div className="px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[1.2px] text-slate-500">
              {group}
            </div>
            {items.map(({ href, icon: Icon, label, badge, exact = true }: any) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium transition-all duration-150 border-l-[3px]',
                  isActive(href, exact)
                    ? 'text-white border-l-[3px]'
                    : 'text-slate-400 border-transparent hover:text-white'
                )}
                style={isActive(href, exact) ? {
                  background: 'rgba(79,195,161,0.15)',
                  borderLeftColor: '#4fc3a1',
                } : {}}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center" style={{ background: '#e55' }}>
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/8 flex-shrink-0 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ background: '#1a6b52' }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white truncate">{staff.full_name}</div>
          <div className="text-[11px] text-slate-500 capitalize">{roleLabel}</div>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-500 hover:text-red-400 transition-colors p-1"
          title="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
