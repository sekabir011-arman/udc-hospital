-- Remove legacy assignee_role column once assignment_role migration is in place

DROP INDEX IF EXISTS idx_nurse_assignments_assignee_role;

ALTER TABLE IF EXISTS public.nurse_assignments
  DROP COLUMN IF EXISTS assignee_role;
