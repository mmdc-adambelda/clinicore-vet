-- ============================================================
--  ClinicCore Vet — Full Database Schema
--  Supabase / PostgreSQL
--  Run this in the Supabase SQL Editor (or via CLI)
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
--  1. CLINICS
-- ────────────────────────────────────────────────────────────
create table if not exists clinics (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  address          text,
  contact_number   text,
  email            text,
  tin              text,
  logo_url         text,
  created_at       timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  2. STAFF PROFILES  (linked to Supabase Auth users)
-- ────────────────────────────────────────────────────────────
create table if not exists staff_profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  clinic_id      uuid not null references clinics(id) on delete cascade,
  full_name      text not null,
  email          text not null,
  role           text not null default 'receptionist'
                   check (role in ('owner','veterinarian','vet_tech','receptionist','front_desk','groomer','billing_staff')),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  3. OWNERS  (pet owners / clients)
-- ────────────────────────────────────────────────────────────
create table if not exists owners (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references clinics(id) on delete cascade,
  full_name        text not null,
  contact_number   text,
  email            text,
  address          text,
  date_of_birth    date,
  id_type          text,           -- valid ID type presented
  id_number        text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  notes            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  4. PETS
-- ────────────────────────────────────────────────────────────
create type pet_sex_type as enum ('male','female','male_neutered','female_spayed','unknown');
create type pet_species_type as enum ('dog','cat','bird','rabbit','hamster','reptile','fish','guinea_pig','other');

create table if not exists pets (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null references clinics(id) on delete cascade,
  owner_id           uuid not null references owners(id) on delete cascade,
  name               text not null,
  species            pet_species_type not null default 'dog',
  breed              text,
  color              text,
  date_of_birth      date,
  sex                pet_sex_type not null default 'unknown',
  weight_kg          numeric(5,2),
  microchip_number   text,
  insurance_provider text,
  insurance_policy   text,
  known_allergies    text,
  photo_url          text,
  is_active          boolean not null default true,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  5. EXAM ROOMS
-- ────────────────────────────────────────────────────────────
create table if not exists exam_rooms (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references clinics(id) on delete cascade,
  room_number text not null,
  room_type   text not null default 'exam'
                check (room_type in ('exam','surgery','isolation','recovery','grooming','lab')),
  status      text not null default 'available'
                check (status in ('available','occupied','maintenance')),
  notes       text,
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  6. APPOINTMENTS
-- ────────────────────────────────────────────────────────────
create type triage_level as enum ('emergency','urgent','semi_urgent','routine');

create table if not exists appointments (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(id) on delete cascade,
  owner_id        uuid not null references owners(id),
  pet_id          uuid not null references pets(id),
  exam_room_id    uuid references exam_rooms(id),
  scheduled_at    timestamptz not null,
  duration_minutes int not null default 30,
  reason          text,
  procedure_type  text,
  triage_level    triage_level not null default 'routine',
  status          text not null default 'scheduled'
                    check (status in ('scheduled','confirmed','checked_in','in_progress','completed','cancelled','no_show')),
  assigned_vet_id uuid references staff_profiles(id),
  notes           text,
  created_by      uuid references staff_profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  7. CLINICAL VISITS  (replaces dental_visits)
-- ────────────────────────────────────────────────────────────
create table if not exists clinical_visits (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references clinics(id) on delete cascade,
  appointment_id    uuid references appointments(id),
  owner_id          uuid not null references owners(id),
  pet_id            uuid not null references pets(id),
  exam_room_id      uuid references exam_rooms(id),
  visit_date        timestamptz not null default now(),
  triage_level      triage_level not null default 'routine',

  -- Vitals
  weight_kg         numeric(5,2),
  temperature_c     numeric(4,1),
  heart_rate        int,             -- bpm
  respiratory_rate  int,             -- breaths/min
  bcs               int check (bcs between 1 and 9),  -- Body Condition Score

  -- SOAP Notes
  subjective        text,            -- chief complaint / history
  objective         text,            -- physical exam findings
  assessment        text,            -- diagnosis / differentials
  plan              text,            -- treatment plan

  -- Diagnosis
  diagnosis         text,
  diagnosis_code    text,            -- VeNom or ICD-10

  -- Workflow tracking
  workflow_step     int not null default 1 check (workflow_step between 1 and 7),
  -- 1=Check-in, 2=Triage, 3=Vitals, 4=Examination, 5=Diagnosis, 6=Treatment, 7=Billing

  assigned_vet_id   uuid references staff_profiles(id),
  status            text not null default 'open'
                      check (status in ('open','in_progress','completed','billed')),
  notes             text,
  created_by        uuid references staff_profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  8. TREATMENT ITEMS
-- ────────────────────────────────────────────────────────────
create table if not exists treatment_items (
  id           uuid primary key default gen_random_uuid(),
  visit_id     uuid not null references clinical_visits(id) on delete cascade,
  item_type    text not null check (item_type in ('medication','procedure','supply','lab','vaccine')),
  name         text not null,
  dose         text,
  route        text,    -- oral, IM, IV, SQ, topical
  frequency    text,
  duration     text,
  quantity     numeric(8,2),
  unit_cost    numeric(10,2) not null default 0,
  performed_by uuid references staff_profiles(id),
  notes        text,
  created_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  9. VACCINATIONS
-- ────────────────────────────────────────────────────────────
create table if not exists vaccinations (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references clinics(id) on delete cascade,
  pet_id           uuid not null references pets(id) on delete cascade,
  vaccine_name     text not null,
  date_given       date not null,
  next_due_date    date,
  batch_number     text,
  manufacturer     text,
  administered_by  uuid references staff_profiles(id),
  visit_id         uuid references clinical_visits(id),
  notes            text,
  created_at       timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 10. PRESCRIPTIONS
-- ────────────────────────────────────────────────────────────
create table if not exists prescriptions (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references clinics(id) on delete cascade,
  visit_id        uuid references clinical_visits(id),
  pet_id          uuid not null references pets(id),
  owner_id        uuid not null references owners(id),
  prescribed_by   uuid references staff_profiles(id),
  medication_name text not null,
  dosage          text not null,
  frequency       text not null,
  duration        text,
  route           text,
  refills         int not null default 0,
  is_controlled   boolean not null default false,
  instructions    text,
  dispensed       boolean not null default false,
  dispensed_at    timestamptz,
  dispensed_by    uuid references staff_profiles(id),
  status          text not null default 'active'
                    check (status in ('active','completed','cancelled','on_hold')),
  created_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 11. LAB RESULTS
-- ────────────────────────────────────────────────────────────
create table if not exists lab_results (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references clinics(id) on delete cascade,
  visit_id       uuid references clinical_visits(id),
  pet_id         uuid not null references pets(id),
  owner_id       uuid not null references owners(id),
  test_name      text not null,
  test_type      text,     -- CBC, chemistry, urinalysis, fecal, cytology, etc.
  ordered_by     uuid references staff_profiles(id),
  ordered_at     timestamptz not null default now(),
  result_value   text,
  result_unit    text,
  reference_range text,
  interpretation text,
  status         text not null default 'pending'
                   check (status in ('pending','in_progress','completed','cancelled')),
  completed_at   timestamptz,
  notes          text,
  created_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 12. INVENTORY
-- ────────────────────────────────────────────────────────────
create table if not exists inventory (
  id                       uuid primary key default gen_random_uuid(),
  clinic_id                uuid not null references clinics(id) on delete cascade,
  name                     text not null,
  category                 text not null default 'Other',
  unit                     text not null default 'piece',
  stock_quantity           int not null default 0,
  reorder_level            int not null default 5,
  unit_cost                numeric(10,2) not null default 0,
  supplier                 text,
  requires_prescription    boolean not null default false,
  is_controlled_substance  boolean not null default false,
  notes                    text,
  status                   text generated always as (
    case
      when stock_quantity = 0 then 'out_of_stock'
      when stock_quantity <= reorder_level / 2 then 'critical'
      when stock_quantity <= reorder_level then 'low'
      else 'ok'
    end
  ) stored,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique(clinic_id, name)
);

-- ────────────────────────────────────────────────────────────
-- 13. INVOICES
-- ────────────────────────────────────────────────────────────
create sequence if not exists invoice_seq start 1001;

create table if not exists invoices (
  id              uuid primary key default gen_random_uuid(),
  or_number       text not null unique default ('OR-' || to_char(now(), 'YYYYMMDD') || '-' || nextval('invoice_seq')),
  clinic_id       uuid not null references clinics(id) on delete cascade,
  owner_id        uuid not null references owners(id),
  pet_id          uuid not null references pets(id),
  visit_id        uuid references clinical_visits(id),
  subtotal        numeric(12,2) not null default 0,
  discount_pct    numeric(5,2) not null default 0,
  discount_amount numeric(12,2) generated always as (
    round(subtotal * discount_pct / 100, 2)
  ) stored,
  total_amount    numeric(12,2) generated always as (
    subtotal - round(subtotal * discount_pct / 100, 2)
  ) stored,
  amount_paid     numeric(12,2) not null default 0,
  balance         numeric(12,2) generated always as (
    (subtotal - round(subtotal * discount_pct / 100, 2)) - amount_paid
  ) stored,
  payment_mode    text not null default 'cash'
                    check (payment_mode in ('cash','gcash','bank_transfer','card','insurance','hmo','installment')),
  hmo_provider    text,
  status          text not null default 'issued'
                    check (status in ('draft','issued','partial','paid','overdue','cancelled')),
  issued_at       timestamptz not null default now(),
  notes           text,
  created_by      uuid references staff_profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 14. INVOICE ITEMS
-- ────────────────────────────────────────────────────────────
create table if not exists invoice_items (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references invoices(id) on delete cascade,
  procedure_name text not null,
  quantity       numeric(8,2) not null default 1,
  unit_cost      numeric(10,2) not null default 0,
  total_cost     numeric(10,2) generated always as (quantity * unit_cost) stored,
  created_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 15. PAYMENTS
-- ────────────────────────────────────────────────────────────
create table if not exists payments (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references invoices(id) on delete cascade,
  clinic_id        uuid references clinics(id),
  amount           numeric(12,2) not null,
  method           text not null default 'cash',
  reference_number text,
  received_by      uuid references staff_profiles(id),
  created_at       timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 16. PROCEDURE TEMPLATES
-- ────────────────────────────────────────────────────────────
create table if not exists procedure_templates (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clinics(id) on delete cascade,
  name         text not null,
  category     text not null default 'Wellness',
  default_cost numeric(10,2) not null default 0,
  created_at   timestamptz not null default now(),
  unique(clinic_id, name)
);

-- ────────────────────────────────────────────────────────────
-- 17. AUDIT LOGS
-- ────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid references clinics(id),
  user_id       uuid references auth.users(id),
  user_name     text,
  action        text not null,
  resource_type text,
  resource_id   uuid,
  ip_address    inet,
  created_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 18. TRIGGERS — keep updated_at fresh
-- ────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ begin
  create trigger trg_owners_updated_at   before update on owners   for each row execute function set_updated_at();
  create trigger trg_pets_updated_at     before update on pets     for each row execute function set_updated_at();
  create trigger trg_visits_updated_at   before update on clinical_visits for each row execute function set_updated_at();
  create trigger trg_invoices_updated_at before update on invoices for each row execute function set_updated_at();
  create trigger trg_inventory_updated_at before update on inventory for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────
-- 19. TRIGGER — auto-update invoice amount_paid & status from payments
-- ────────────────────────────────────────────────────────────
create or replace function sync_invoice_payment()
returns trigger language plpgsql as $$
declare
  v_total    numeric;
  v_paid     numeric;
  v_new_status text;
begin
  select total_amount into v_total from invoices where id = NEW.invoice_id;
  select coalesce(sum(amount),0) into v_paid from payments where invoice_id = NEW.invoice_id;

  v_new_status :=
    case
      when v_paid = 0         then 'issued'
      when v_paid >= v_total  then 'paid'
      else 'partial'
    end;

  update invoices set amount_paid = v_paid, status = v_new_status where id = NEW.invoice_id;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_invoice on payments;
create trigger trg_sync_invoice after insert or update on payments
  for each row execute function sync_invoice_payment();

-- ────────────────────────────────────────────────────────────
-- 20. TRIGGER — auto-fill user_name in audit_logs
-- ────────────────────────────────────────────────────────────
create or replace function fill_audit_user_name()
returns trigger language plpgsql as $$
begin
  if NEW.user_name is null and NEW.user_id is not null then
    select full_name into NEW.user_name from staff_profiles where id = NEW.user_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_audit_user_name on audit_logs;
create trigger trg_audit_user_name before insert on audit_logs
  for each row execute function fill_audit_user_name();

-- ────────────────────────────────────────────────────────────
-- 21. INDEXES for common queries
-- ────────────────────────────────────────────────────────────
create index if not exists idx_pets_owner_id        on pets(owner_id);
create index if not exists idx_pets_clinic_id       on pets(clinic_id);
create index if not exists idx_appointments_date    on appointments(clinic_id, scheduled_at);
create index if not exists idx_visits_clinic_pet    on clinical_visits(clinic_id, pet_id);
create index if not exists idx_vaccinations_pet     on vaccinations(pet_id);
create index if not exists idx_vaccinations_due     on vaccinations(clinic_id, next_due_date);
create index if not exists idx_invoices_status      on invoices(clinic_id, status);
create index if not exists idx_invoices_owner       on invoices(owner_id);
create index if not exists idx_prescriptions_pet    on prescriptions(pet_id);
create index if not exists idx_lab_results_pet      on lab_results(pet_id);
create index if not exists idx_audit_logs_clinic    on audit_logs(clinic_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 22. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
alter table clinics            enable row level security;
alter table staff_profiles     enable row level security;
alter table owners             enable row level security;
alter table pets               enable row level security;
alter table exam_rooms         enable row level security;
alter table appointments       enable row level security;
alter table clinical_visits    enable row level security;
alter table treatment_items    enable row level security;
alter table vaccinations       enable row level security;
alter table prescriptions      enable row level security;
alter table lab_results        enable row level security;
alter table inventory          enable row level security;
alter table invoices           enable row level security;
alter table invoice_items      enable row level security;
alter table payments           enable row level security;
alter table procedure_templates enable row level security;
alter table audit_logs         enable row level security;

-- Helper function to get the current user's clinic_id
create or replace function get_my_clinic_id()
returns uuid language sql stable security definer as $$
  select clinic_id from staff_profiles where id = auth.uid() limit 1;
$$;

-- Generic clinic-scoped policy macro (apply to each table)
do $$ begin
  -- staff_profiles: see own clinic
  execute $p$ create policy "clinic_staff_own" on staff_profiles
    using (clinic_id = get_my_clinic_id()) $p$;
  -- owners
  execute $p$ create policy "clinic_owners" on owners
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- pets
  execute $p$ create policy "clinic_pets" on pets
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- exam_rooms
  execute $p$ create policy "clinic_rooms" on exam_rooms
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- appointments
  execute $p$ create policy "clinic_appts" on appointments
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- clinical_visits
  execute $p$ create policy "clinic_visits" on clinical_visits
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- treatment_items (via visit)
  execute $p$ create policy "clinic_treatments" on treatment_items
    using (visit_id in (select id from clinical_visits where clinic_id = get_my_clinic_id())) $p$;
  -- vaccinations
  execute $p$ create policy "clinic_vaccines" on vaccinations
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- prescriptions
  execute $p$ create policy "clinic_rx" on prescriptions
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- lab_results
  execute $p$ create policy "clinic_labs" on lab_results
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- inventory
  execute $p$ create policy "clinic_inventory" on inventory
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- invoices
  execute $p$ create policy "clinic_invoices" on invoices
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- invoice_items (via invoice)
  execute $p$ create policy "clinic_invoice_items" on invoice_items
    using (invoice_id in (select id from invoices where clinic_id = get_my_clinic_id())) $p$;
  -- payments (via invoice)
  execute $p$ create policy "clinic_payments" on payments
    using (clinic_id = get_my_clinic_id()) $p$;
  -- procedure_templates
  execute $p$ create policy "clinic_templates" on procedure_templates
    using (clinic_id = get_my_clinic_id()) with check (clinic_id = get_my_clinic_id()) $p$;
  -- audit_logs
  execute $p$ create policy "clinic_audit" on audit_logs
    using (clinic_id = get_my_clinic_id()) $p$;
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────
-- 23. SEED — Default procedure templates
-- ────────────────────────────────────────────────────────────
-- NOTE: Replace 'YOUR_CLINIC_ID' with your actual clinic UUID after creating your clinic

-- insert into procedure_templates (clinic_id, name, category, default_cost) values
--   ('YOUR_CLINIC_ID', 'Annual Wellness Exam',       'Wellness',    500),
--   ('YOUR_CLINIC_ID', 'Puppy Package (Exam+Vacc)',  'Wellness',   1200),
--   ('YOUR_CLINIC_ID', 'Vaccination - Rabies',       'Vaccination',  350),
--   ('YOUR_CLINIC_ID', 'Vaccination - Distemper',    'Vaccination',  500),
--   ('YOUR_CLINIC_ID', 'Spay (Female Dog)',           'Surgery',    4500),
--   ('YOUR_CLINIC_ID', 'Neuter (Male Dog)',           'Surgery',    3500),
--   ('YOUR_CLINIC_ID', 'Dental Prophylaxis',          'Dental',     2500),
--   ('YOUR_CLINIC_ID', 'Blood Panel (CBC)',           'Diagnostics', 800),
--   ('YOUR_CLINIC_ID', 'Blood Chemistry Panel',      'Diagnostics', 1200),
--   ('YOUR_CLINIC_ID', 'Urinalysis',                  'Diagnostics', 450),
--   ('YOUR_CLINIC_ID', 'X-Ray (per view)',             'Diagnostics', 750),
--   ('YOUR_CLINIC_ID', 'Ultrasound Abdomen',          'Diagnostics',1500),
--   ('YOUR_CLINIC_ID', 'Full Groom (Dog - Small)',    'Grooming',    600),
--   ('YOUR_CLINIC_ID', 'Full Groom (Dog - Large)',    'Grooming',   1200),
--   ('YOUR_CLINIC_ID', 'Deworming',                   'Wellness',    250),
--   ('YOUR_CLINIC_ID', 'Microchipping',               'Wellness',    800),
--   ('YOUR_CLINIC_ID', 'Emergency Consultation',      'Emergency',  1500),
--   ('YOUR_CLINIC_ID', 'IV Fluid Therapy (per day)',  'Wellness',    900),
--   ('YOUR_CLINIC_ID', 'Hospitalization (per day)',   'Wellness',   1200);

-- ────────────────────────────────────────────────────────────
-- ✅ Schema complete. See README.md for next steps.
-- ────────────────────────────────────────────────────────────
