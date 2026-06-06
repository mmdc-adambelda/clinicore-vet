// ============================================================
// ClinicCore Vet — TypeScript Types
// Matches Supabase PostgreSQL schema (001_clinicore_vet_schema.sql)
// ============================================================

export type UserRole = 'owner' | 'veterinarian' | 'vet_tech' | 'front_desk' | 'receptionist' | 'groomer' | 'billing_staff'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type VaccinationStatus = 'up_to_date' | 'due_soon' | 'overdue'
export type PaymentMode = 'cash' | 'gcash' | 'bank_transfer' | 'card' | 'insurance' | 'hmo' | 'installment'
export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type InventoryStatus = 'ok' | 'low' | 'critical' | 'out_of_stock'
export type PetSex = 'male' | 'female' | 'male_neutered' | 'female_spayed' | 'unknown'
export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | 'reptile' | 'fish' | 'guinea_pig' | 'other'
export type TriageLevel = 'emergency' | 'urgent' | 'semi_urgent' | 'routine'
export type RoomType = 'exam' | 'surgery' | 'isolation' | 'recovery' | 'grooming' | 'lab'
export type RoomStatus = 'available' | 'occupied' | 'maintenance'
export type VisitStatus = 'open' | 'in_progress' | 'completed' | 'billed'
export type PrescriptionStatus = 'active' | 'completed' | 'cancelled' | 'on_hold'
export type LabStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

// ── CLINIC ──────────────────────────────────────────────────
export interface Clinic {
  id: string
  name: string
  address: string | null
  contact_number: string | null
  email: string | null
  tin: string | null
  logo_url: string | null
  created_at: string
}

// ── STAFF PROFILE ────────────────────────────────────────────
export interface StaffProfile {
  id: string
  clinic_id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
  clinic?: Clinic
}

// ── OWNER ────────────────────────────────────────────────────
export interface Owner {
  id: string
  clinic_id: string
  full_name: string
  contact_number: string | null
  email: string | null
  address: string | null
  date_of_birth: string | null
  id_type: string | null
  id_number: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  pets?: Pet[]
}

// ── PET ──────────────────────────────────────────────────────
export interface Pet {
  id: string
  owner_id: string
  clinic_id: string
  name: string
  species: PetSpecies
  breed: string | null
  color: string | null
  date_of_birth: string | null
  sex: PetSex
  weight_kg: number | null
  microchip_number: string | null
  insurance_provider: string | null
  insurance_policy: string | null
  known_allergies: string | null
  photo_url: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  owner?: Owner
  vaccinations?: Vaccination[]
}

// ── EXAM ROOM ────────────────────────────────────────────────
export interface ExamRoom {
  id: string
  clinic_id: string
  room_number: string
  room_type: RoomType
  status: RoomStatus
  notes: string | null
  created_at: string
}

// ── APPOINTMENT ──────────────────────────────────────────────
export interface Appointment {
  id: string
  clinic_id: string
  owner_id: string
  pet_id: string
  exam_room_id: string | null
  scheduled_at: string
  duration_minutes: number
  reason: string | null
  procedure_type: string | null
  triage_level: TriageLevel
  status: AppointmentStatus
  assigned_vet_id: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  owner?: Owner
  pet?: Pet
  exam_room?: ExamRoom
  staff?: StaffProfile
}

// ── CLINICAL VISIT ───────────────────────────────────────────
export interface ClinicalVisit {
  id: string
  clinic_id: string
  appointment_id: string | null
  owner_id: string
  pet_id: string
  exam_room_id: string | null
  visit_date: string
  triage_level: TriageLevel
  weight_kg: number | null
  temperature_c: number | null
  heart_rate: number | null
  respiratory_rate: number | null
  bcs: number | null
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  diagnosis: string | null
  diagnosis_code: string | null
  workflow_step: number
  assigned_vet_id: string | null
  status: VisitStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  owner?: Owner
  pet?: Pet
  exam_room?: ExamRoom
  items?: TreatmentItem[]
}

// ── TREATMENT ITEM ───────────────────────────────────────────
export interface TreatmentItem {
  id: string
  visit_id: string
  item_type: 'medication' | 'procedure' | 'supply' | 'lab' | 'vaccine'
  name: string
  dose: string | null
  route: string | null
  frequency: string | null
  duration: string | null
  quantity: number | null
  unit_cost: number
  performed_by: string | null
  notes: string | null
  created_at: string
}

// ── VACCINATION ──────────────────────────────────────────────
export interface Vaccination {
  id: string
  clinic_id: string
  pet_id: string
  vaccine_name: string
  date_given: string
  next_due_date: string | null
  batch_number: string | null
  manufacturer: string | null
  administered_by: string | null
  visit_id: string | null
  notes: string | null
  created_at: string
  pet?: Pet
}

// ── PRESCRIPTION ─────────────────────────────────────────────
export interface Prescription {
  id: string
  clinic_id: string
  visit_id: string | null
  pet_id: string
  owner_id: string
  prescribed_by: string | null
  medication_name: string
  dosage: string
  frequency: string
  duration: string | null
  route: string | null
  refills: number
  is_controlled: boolean
  instructions: string | null
  dispensed: boolean
  dispensed_at: string | null
  dispensed_by: string | null
  status: PrescriptionStatus
  created_at: string
  pet?: Pet
  owner?: Owner
}

// ── LAB RESULT ───────────────────────────────────────────────
export interface LabResult {
  id: string
  clinic_id: string
  visit_id: string | null
  pet_id: string
  owner_id: string
  test_name: string
  test_type: string | null
  ordered_by: string | null
  ordered_at: string
  result_value: string | null
  result_unit: string | null
  reference_range: string | null
  interpretation: string | null
  status: LabStatus
  completed_at: string | null
  notes: string | null
  created_at: string
  pet?: Pet
  owner?: Owner
}

// ── INVENTORY ITEM ───────────────────────────────────────────
export interface InventoryItem {
  id: string
  clinic_id: string
  name: string
  category: string
  unit: string
  stock_quantity: number
  reorder_level: number
  unit_cost: number
  supplier: string | null
  requires_prescription: boolean
  is_controlled_substance: boolean
  notes: string | null
  status: InventoryStatus
  created_at: string
  updated_at: string
}

// ── INVOICE ──────────────────────────────────────────────────
export interface Invoice {
  id: string
  or_number: string
  clinic_id: string
  owner_id: string
  pet_id: string
  visit_id: string | null
  subtotal: number
  discount_pct: number
  discount_amount: number
  total_amount: number
  amount_paid: number
  balance: number
  payment_mode: PaymentMode
  hmo_provider: string | null
  status: InvoiceStatus
  issued_at: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  owner?: Owner
  pet?: Pet
  payments?: Payment[]
}

// ── INVOICE ITEM ─────────────────────────────────────────────
export interface InvoiceItem {
  id: string
  invoice_id: string
  procedure_name: string
  quantity: number
  unit_cost: number
  total_cost: number
  created_at: string
}

// ── PAYMENT ──────────────────────────────────────────────────
export interface Payment {
  id: string
  invoice_id: string
  clinic_id: string | null
  amount: number
  method: string
  reference_number: string | null
  received_by: string | null
  created_at: string
}

// ── PROCEDURE TEMPLATE ───────────────────────────────────────
export interface ProcedureTemplate {
  id: string
  clinic_id: string
  name: string
  category: string
  default_cost: number
  created_at: string
}

// ── AUDIT LOG ────────────────────────────────────────────────
export interface AuditLog {
  id: string
  clinic_id: string | null
  user_id: string | null
  user_name: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  ip_address: string | null
  created_at: string
}

// ── DASHBOARD STATS ──────────────────────────────────────────
export interface DashboardStats {
  today_appointments: number
  today_revenue: number
  active_pets: number
  active_owners: number
  pending_balance: number
  new_pets_month: number
  cancellation_rate: number
  vaccination_overdue: number
  vaccination_due_soon: number
  weekly_revenue: { day: string; amount: number }[]
  species_breakdown: { species: string; count: number }[]
  today_schedule: any[]
  inventory_alerts: any[]
}
