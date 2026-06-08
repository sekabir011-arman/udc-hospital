-- Admin Authentication System
-- Provides secure session management with audit logging

-- admin_sessions table: track active admin sessions
CREATE TABLE public.admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  login_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_timestamp TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- admin_login_audit table: audit trail for all login attempts
CREATE TABLE public.admin_login_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'login', 'logout', 'failed_login', 'session_expired'
  username TEXT,
  success BOOLEAN DEFAULT TRUE,
  failure_reason TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- role_changes_audit table: track all role assignments/changes
CREATE TABLE public.role_changes_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  old_role public.user_role,
  new_role public.user_role NOT NULL,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  change_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_admin_sessions_user_id ON public.admin_sessions(user_id);
CREATE INDEX idx_admin_sessions_token ON public.admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_active ON public.admin_sessions(is_active);
CREATE INDEX idx_admin_sessions_expires_at ON public.admin_sessions(expires_at);
CREATE INDEX idx_admin_login_audit_user_id ON public.admin_login_audit(user_id);
CREATE INDEX idx_admin_login_audit_created_at ON public.admin_login_audit(created_at DESC);
CREATE INDEX idx_admin_login_audit_ip ON public.admin_login_audit(ip_address);
CREATE INDEX idx_role_changes_audit_user_id ON public.role_changes_audit(user_id);
CREATE INDEX idx_role_changes_audit_changed_by ON public.role_changes_audit(changed_by);
CREATE INDEX idx_role_changes_audit_created_at ON public.role_changes_audit(created_at DESC);

-- Add password_hash column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create trigger to auto-update updated_at for admin_sessions
CREATE OR REPLACE TRIGGER trg_admin_sessions_updated_at
BEFORE UPDATE ON public.admin_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
