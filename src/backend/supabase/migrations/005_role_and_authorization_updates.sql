-- Add frontend-aligned backend role values and create authorization audit tracking

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'professor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'associate_professor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'assistant_professor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'consultant_doctor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'assistant_registrar';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'intern_doctor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'staff';

-- Provide a generic authorization audit log for emergency access and prescription approvals.
CREATE TABLE IF NOT EXISTS public.authorization_audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  action text NOT NULL,
  reason text NOT NULL,
  performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  performed_by_role public.user_role NOT NULL,
  expires_at timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_authorization_audit_log_target ON public.authorization_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_authorization_audit_log_performed_by ON public.authorization_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_authorization_audit_log_created_at ON public.authorization_audit_log(created_at DESC);
