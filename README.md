# ClinicCore Vet 🐾

**Smarter Care. Healthier Pets.**

A modern, full-featured veterinary clinic management system built with Next.js, Supabase, and deployed on Vercel. Designed to outperform Kreloses with a faster, cleaner, and more capable experience.

---

## ✨ Features

| Module | Description |
|--------|-------------|
| 📊 Dashboard | KPIs, weekly revenue chart, species breakdown, today's schedule, alerts |
| 📅 Appointments | Multi-status workflow, triage levels (Emergency → Routine), vet assignment |
| 👤 Owners & Pets | Owner registry with multi-pet support, allergy flags, microchip, insurance |
| 🩺 Clinical Workflow | 7-step SOAP workflow, BCS vitals, VeNom/ICD-10 diagnosis codes |
| 💉 Vaccinations | Tracker with overdue/due-soon alerts, batch/lot numbers |
| 💊 Prescriptions | Rx management with controlled substance flags |
| 🔬 Lab & Diagnostics | Lab orders, results, reference ranges |
| 🧾 Billing | Invoicing per pet/owner, payment tracking, OR printing |
| 📦 Inventory | Vet-specific categories, controlled substance logging, CSV import/export |
| 📈 Reports & KPIs | Revenue, species distribution, appointment analytics |
| ⚙️ Settings | Clinic profile, staff RBAC, exam rooms, procedure price templates, audit log |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- A Vercel account (for deployment)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/clinicore-vet.git
cd clinicore-vet
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up the Database

1. Go to your Supabase project → **SQL Editor**
2. Open `supabase/migrations/001_clinicore_vet_schema.sql`
3. Paste and run the entire file
4. (Optional) Uncomment and run the seed section at the bottom, replacing `YOUR_CLINIC_ID`

### 4. First-Time Setup

1. Run the app: `npm run dev`
2. Go to `/register` to create your clinic and admin account
3. Your admin is created in Supabase Auth and `staff_profiles` simultaneously
4. To add more staff: create users in Supabase Auth → Dashboard, then update their role in Settings → Staff & Roles

### 5. Deploy to Vercel

```bash
# Push to GitHub first, then:
vercel --prod
```

Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel Environment Variables.

---

## 🔐 Roles & Permissions

| Role | Access |
|------|--------|
| **Clinic Owner** | Full access including settings and financials |
| **Veterinarian** | Clinical, prescriptions, lab, billing, reports |
| **Vet Technician** | Clinical, vaccinations, lab, appointments |
| **Receptionist** | Appointments, owner/pet registration, vaccinations |
| **Front Desk** | Appointments, owners, billing/invoicing |
| **Groomer** | Appointments and owner/pet view only |
| **Billing Staff** | Billing and reports only |

---

## 🗄️ Database Schema Overview

```
clinics
  └─ staff_profiles (auth.users)
  └─ owners (pet owners / clients)
       └─ pets
            └─ vaccinations
            └─ clinical_visits
                 └─ treatment_items
                 └─ prescriptions
                 └─ lab_results
            └─ appointments
  └─ invoices
       └─ invoice_items
       └─ payments
  └─ inventory
  └─ exam_rooms
  └─ procedure_templates
  └─ audit_logs
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register
│   └── (dashboard)/     # All app pages
│       ├── dashboard/
│       ├── appointments/
│       ├── owners/
│       ├── clinical/
│       ├── vaccinations/
│       ├── prescriptions/
│       ├── lab/
│       ├── billing/
│       ├── inventory/
│       ├── reports/
│       └── settings/
├── components/          # Feature components
├── lib/
│   ├── db.ts            # Server-side data access
│   ├── utils.ts         # Helpers
│   └── supabase/        # Supabase clients
└── types/
    └── index.ts         # TypeScript types
supabase/
└── migrations/
    └── 001_clinicore_vet_schema.sql
```

---

## 🤝 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Deployment**: Vercel
- **Version Control**: GitHub

---

*Built to be better than Kreloses. 🐕🐈*
