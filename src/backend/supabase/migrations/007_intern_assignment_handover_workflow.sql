-- Extend nurse assignment workflow for intern doctor assignments and handovers

ALTER TABLE IF EXISTS public.nurse_assignments
  ADD COLUMN IF NOT EXISTS assignee_role public.user_role,
  ADD COLUMN IF NOT EXISTS handover_from uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handover_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS handover_notes text,
  ADD COLUMN IF NOT EXISTS handover_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_nurse_assignments_assignee_role on public.nurse_assignments(assignee_role);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_handover_at on public.nurse_assignments(handover_at desc);
