import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const geistSans = localFont({ src: './fonts/GeistVF.woff', variable: '--font-geist-sans' })
const geistMono = localFont({ src: './fonts/GeistMonoVF.woff', variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'ClinicCore Vet — Smarter Care. Healthier Pets.',
  description: 'Veterinary Practice Management System — appointments, medical records, vaccinations, billing, and more.',
  icons: { icon: '/logo.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        {children}
      </body>
    </html>
  )
}
