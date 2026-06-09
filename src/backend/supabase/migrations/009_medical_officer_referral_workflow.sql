-- Extend patient assignment workflow for medical officer handover and consultant referral status tracking

CREATE TYPE IF NOT EXISTS public.referral_status AS ENUM (
  'new',
  'pending_review',
  'accepted',
  'assessment',
  'recommendation_issued',
  'closed'
);

ALTER TABLE IF EXISTS public.nurse_assignments
  ADD COLUMN IF NOT EXISTS handover_clinical_summary text,
  ADD COLUMN IF NOT EXISTS is_emergency boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS referral_status public.referral_status DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS response_requested_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS responded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS assessment_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS recommendation_issued_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_nurse_assignments_is_emergency on public.nurse_assignments(is_emergency);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_referral_status on public.nurse_assignments(referral_status);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_response_requested_at on public.nurse_assignments(response_requested_at desc);
CREATE INDEX IF NOT EXISTS idx_nurse_assignments_responded_at on public.nurse_assignments(responded_at desc);
