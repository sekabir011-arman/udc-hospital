-- Add nurse assignment records and support user department/unit metadata

ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS unit text;

CREATE TABLE IF NOT EXISTS public.nurse_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  nurse_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  department text,
  unit text,
  ward text,
  is_primary boolean DEFAULT false,
  active boolean DEFAULT true,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_by_role public.user_role,
  assigned_at timestamp with time zone DEFAULT now(),
  start_at timestamp with time zone DEFAULT now(),
  end_at timestamp with time zone,
  transfer_reason text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TRIGGER trg_nurse_assignments_updated_at
BEFORE UPDATE ON public.nurse_assignments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_nurse_assignments_patient on public.nurse_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_nurse on public.nurse_assignments(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_active on public.nurse_assignments(active);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_assigned_at on public.nurse_assignments(assigned_at desc);
