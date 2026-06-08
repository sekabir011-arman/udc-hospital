-- Enable extensions
create extension if not exists "uuid-ossp";

-- Custom enum types
create type public.user_role as enum (
  'admin',
  'consultant',
  'consultant_doctor',
  'doctor',
  'assistant_professor',
  'associate_professor',
  'professor',
  'medical_officer',
  'assistant_registrar',
  'registrar',
  'intern',
  'intern_doctor',
  'nurse',
  'reception',
  'staff',
  'patient'
);

create type public.user_status as enum ('pending', 'active', 'approved', 'rejected', 'disabled');

create type public.patient_gender as enum ('M', 'F', 'O');
create type public.appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
create type public.appointment_type as enum ('chamber', 'admitted');
create type public.vitals_status as enum ('drafted', 'pending_review', 'verified', 'rejected');
create type public.investigation_status as enum ('pending', 'completed', 'reviewed');
create type public.visit_type as enum ('outpatient', 'inpatient', 'emergency', 'follow-up', 'admitted');
create type public.admission_status as enum ('draft', 'admitted', 'discharged', 'transferred');
create type public.handover_status as enum ('submitted', 'draft');
create type public.handover_shift as enum ('morning', 'evening', 'night');
create type public.serial_status as enum ('waiting', 'current', 'done', 'skipped');
create type public.payment_method as enum ('cash', 'bkash', 'nagad', 'card');
create type public.invoice_state as enum ('pending', 'partial', 'paid', 'refunded', 'partial_refunded');
create type public.submission_type as enum ('complaint', 'vitals', 'investigation');
create type public.submission_status as enum ('pending', 'approved', 'rejected');
create type public.patient_type as enum ('outdoor', 'indoor', 'emergency', 'admitted');
create type public.patient_status as enum ('Active', 'Admitted', 'Discharged');

-- Common helper to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Users table
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role public.user_role not null,
  status public.user_status default 'pending',
  phone text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- Patients table
create table public.patients (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  gender public.patient_gender not null,
  phone text not null,
  email text,
  address text not null,
  city text not null,
  state text not null,
  zip_code text not null,
  blood_group text,
  allergies text[],
  chronic_conditions text[],
  past_surgical_history text,
  patient_type public.patient_type not null default 'outdoor',
  register_number text,
  photo text,
  department text,
  bed_number text,
  ward text,
  hospital_name text,
  admitted_on timestamp with time zone,
  discharge_date timestamp with time zone,
  is_admitted boolean default false,
  status public.patient_status default 'Active',
  edd date,
  lmp_date date,
  consultant_assignment jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_patients_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

-- Visits table
create table public.visits (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid references public.users(id) on delete set null,
  visit_date timestamp with time zone not null,
  visit_type public.visit_type not null,
  chief_complaint text not null,
  history_of_present_illness text,
  physical_examination text,
  diagnosis text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_visits_updated_at
before update on public.visits
for each row execute function public.set_updated_at();

-- Vitals table
create table public.vitals (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  blood_pressure text not null,
  pulse integer not null,
  temperature numeric not null,
  respiratory_rate integer not null,
  sp_o2 integer not null,
  blood_glucose numeric,
  gcs integer,
  recorded_at timestamp with time zone default now(),
  recorded_by uuid not null references public.users(id) on delete restrict,
  status public.vitals_status not null default 'drafted',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_vitals_updated_at
before update on public.vitals
for each row execute function public.set_updated_at();

-- Appointments table
create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.users(id) on delete restrict,
  appointment_date timestamp with time zone not null,
  duration integer not null,
  reason text not null,
  status public.appointment_status not null default 'scheduled',
  appointment_type public.appointment_type not null default 'chamber',
  notes text,
  serial_number integer,
  serial_date date,
  visit_time time,
  hospital_name text,
  bed_ward_number text,
  admission_reason text,
  referring_doctor text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

-- Prescriptions table
create table public.prescriptions (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  prescription_date timestamp with time zone default now(),
  diagnosis text,
  notes text,
  is_draft boolean default false,
  is_finalized boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_prescriptions_updated_at
before update on public.prescriptions
for each row execute function public.set_updated_at();

create table public.prescription_items (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medicine_id text,
  name text not null,
  dosage text not null,
  frequency text not null,
  duration integer not null,
  instructions text,
  route text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_prescription_items_updated_at
before update on public.prescription_items
for each row execute function public.set_updated_at();

-- Investigations table
create table public.investigations (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  test_name text not null,
  result text,
  normal_range text,
  unit text,
  status public.investigation_status not null default 'pending',
  ordered_by uuid not null references public.users(id) on delete restrict,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_investigations_updated_at
before update on public.investigations
for each row execute function public.set_updated_at();

-- Admission history table
create table public.admission_histories (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  ward text,
  bed_number text,
  admission_date date,
  discharge_date date,
  status public.admission_status not null default 'draft',
  provisional_diagnosis text,
  chief_complaints text[],
  drug_history text[],
  created_by uuid references public.users(id) on delete set null,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_admission_histories_updated_at
before update on public.admission_histories
for each row execute function public.set_updated_at();

-- Daily progress notes table
create table public.daily_progress_notes (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  author_id uuid references public.users(id) on delete set null,
  note_date date not null,
  subjective text,
  objective text,
  assessment text,
  plan text,
  is_draft boolean default true,
  status text default 'draft',
  consultant_comments text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_daily_progress_notes_updated_at
before update on public.daily_progress_notes
for each row execute function public.set_updated_at();

-- Handover entries table
create table public.handover_entries (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  status public.handover_status not null default 'draft',
  shift public.handover_shift not null,
  ward text,
  bed_number text,
  register_number text,
  patient_name text,
  clinical_summary text,
  current_consultant text,
  consultant_comment text,
  pending_investigations text[],
  vitals_summary text,
  diagnosis text,
  missed_medications text[],
  shift_start_time timestamp with time zone,
  shift_end_time timestamp with time zone,
  given_by uuid references public.users(id) on delete set null,
  taken_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_handover_entries_updated_at
before update on public.handover_entries
for each row execute function public.set_updated_at();

-- Clinical alerts table
create table public.clinical_alerts (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  alert_type text not null,
  severity text not null,
  message text not null,
  generated_at timestamp with time zone default now(),
  resolved boolean default false,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_clinical_alerts_updated_at
before update on public.clinical_alerts
for each row execute function public.set_updated_at();

-- Medication administration records table
create table public.medication_admin_records (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  prescription_id uuid references public.prescriptions(id) on delete set null,
  record_date date not null,
  shift public.handover_shift,
  nurse_id uuid references public.users(id) on delete set null,
  dose_log jsonb,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_medication_admin_records_updated_at
before update on public.medication_admin_records
for each row execute function public.set_updated_at();

-- Consent forms table
create table public.consent_forms (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  form_type text not null,
  signed_by uuid references public.users(id) on delete set null,
  signed_at timestamp with time zone,
  signature_data text,
  record jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_consent_forms_updated_at
before update on public.consent_forms
for each row execute function public.set_updated_at();

-- Money receipts table
create table public.money_receipts (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  receipt_number text not null unique,
  date timestamp with time zone default now(),
  patient_name text,
  register_number text,
  amount numeric not null,
  discount_rate numeric default 0,
  final_amount numeric not null,
  payment_method public.payment_method not null,
  paid boolean default true,
  invoice_state public.invoice_state not null default 'paid',
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_money_receipts_updated_at
before update on public.money_receipts
for each row execute function public.set_updated_at();

-- Application storage table for generic frontend persistence
create table public.app_storage (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default now()
);

create trigger trg_app_storage_updated_at
before update on public.app_storage
for each row execute function public.set_updated_at();

-- Serial queue entries table
create table public.serial_queue_entries (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.patients(id) on delete set null,
  serial_number integer not null,
  status public.serial_status not null default 'waiting',
  added_at timestamp with time zone default now(),
  called_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_serial_queue_entries_updated_at
before update on public.serial_queue_entries
for each row execute function public.set_updated_at();

-- Patient submissions table
create table public.patient_submissions (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  submission_type public.submission_type not null,
  data jsonb not null,
  timestamp timestamp with time zone default now(),
  status public.submission_status not null default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create trigger trg_patient_submissions_updated_at
before update on public.patient_submissions
for each row execute function public.set_updated_at();

-- Create indexes for better query performance
create index idx_vitals_patient on public.vitals(patient_id);
create index idx_vitals_recorded_at on public.vitals(recorded_at desc);
create index idx_appointments_patient on public.appointments(patient_id);
create index idx_appointments_date on public.appointments(appointment_date);
create index idx_prescriptions_patient on public.prescriptions(patient_id);
create index idx_investigations_patient on public.investigations(patient_id);
create index idx_visits_patient on public.visits(patient_id);
create index idx_admission_histories_patient on public.admission_histories(patient_id);
create index idx_daily_progress_notes_patient on public.daily_progress_notes(patient_id);
create index idx_handover_entries_patient on public.handover_entries(patient_id);
create index idx_clinical_alerts_patient on public.clinical_alerts(patient_id);
create index idx_money_receipts_patient on public.money_receipts(patient_id);
create index idx_patient_submissions_patient on public.patient_submissions(patient_id);

-- Enable RLS (Row Level Security)
alter table public.users enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.vitals enable row level security;
alter table public.appointments enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;
alter table public.investigations enable row level security;
alter table public.admission_histories enable row level security;
alter table public.daily_progress_notes enable row level security;
alter table public.handover_entries enable row level security;
alter table public.clinical_alerts enable row level security;
alter table public.medication_admin_records enable row level security;
alter table public.consent_forms enable row level security;
alter table public.money_receipts enable row level security;
alter table public.serial_queue_entries enable row level security;
alter table public.patient_submissions enable row level security;

-- RLS Policies
create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = id);

create policy "Admins can view all users" on public.users
  for select using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

create policy "Authenticated users can select public patients" on public.patients
  for select using (true);

create policy "Authenticated users can select public vitals" on public.vitals
  for select using (true);

create policy "Authenticated users can select public appointments" on public.appointments
  for select using (true);

create policy "Authenticated users can select public prescriptions" on public.prescriptions
  for select using (true);

create policy "Authenticated users can select public investigations" on public.investigations
  for select using (true);

create policy "Authenticated users can select records" on public.visits
  for select using (true);

create policy "Authenticated users can select admission histories" on public.admission_histories
  for select using (true);

create policy "Authenticated users can select daily progress notes" on public.daily_progress_notes
  for select using (true);

create policy "Authenticated users can select handover entries" on public.handover_entries
  for select using (true);

create policy "Authenticated users can select clinical alerts" on public.clinical_alerts
  for select using (true);

create policy "Authenticated users can select medication administration records" on public.medication_admin_records
  for select using (true);

create policy "Authenticated users can select consent forms" on public.consent_forms
  for select using (true);

create policy "Authenticated users can select money receipts" on public.money_receipts
  for select using (true);

create policy "Authenticated users can select serial queue entries" on public.serial_queue_entries
  for select using (true);

create policy "Authenticated users can select patient submissions" on public.patient_submissions
  for select using (true);
