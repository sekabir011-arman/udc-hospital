-- Add independent patient assignment roles and consultant referral metadata

CREATE TYPE IF NOT EXISTS public.assignment_role AS ENUM (
  'nurse',
  'intern_doctor',
  'medical_officer',
  'assistant_registrar',
  'registrar',
  'consultant'
);

ALTER TABLE IF EXISTS public.nurse_assignments
  ADD COLUMN IF NOT EXISTS assignment_role public.assignment_role NOT NULL DEFAULT 'nurse',
  ADD COLUMN IF NOT EXISTS is_consulting boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_reason text,
  ADD COLUMN IF NOT EXISTS referral_requested_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_at timestamp with time zone;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'nurse_assignments'
      AND column_name = 'assignee_role'
  ) THEN
    UPDATE public.nurse_assignments
    SET assignment_role = CASE
      WHEN assignee_role = 'intern' THEN 'intern_doctor'
      WHEN assignee_role = 'intern_doctor' THEN 'intern_doctor'
      WHEN assignee_role = 'medical_officer' THEN 'medical_officer'
      WHEN assignee_role = 'assistant_registrar' THEN 'assistant_registrar'
      WHEN assignee_role = 'registrar' THEN 'registrar'
      WHEN assignee_role = 'consultant' THEN 'consultant'
      WHEN assignee_role = 'consultant_doctor' THEN 'consultant'
      WHEN assignee_role = 'assistant_professor' THEN 'consultant'
      WHEN assignee_role = 'associate_professor' THEN 'consultant'
      WHEN assignee_role = 'professor' THEN 'consultant'
      ELSE 'nurse'
    END
    WHERE assignee_role IS NOT NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_nurse_assignments_assignment_role on public.nurse_assignments(assignment_role);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_is_consulting on public.nurse_assignments(is_consulting);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_referral_at on public.nurse_assignments(referral_at desc);
