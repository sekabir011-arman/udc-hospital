-- File Upload Management System
-- Manages all file uploads with versioning, access control, and audit logging

-- uploaded_files table: metadata for all uploaded files
CREATE TABLE public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_type TEXT,
  file_size_bytes BIGINT,
  file_hash TEXT, -- SHA-256 for deduplication
  storage_path TEXT NOT NULL,
  storage_backend TEXT DEFAULT 'local', -- 'local', 's3', 'gcs'
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Entity association
  associated_entity_type TEXT, -- 'patient', 'prescription', 'signature', 'photo', 'report'
  associated_entity_id UUID,
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_archived BOOLEAN DEFAULT FALSE,
  archived_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  archived_at TIMESTAMP WITH TIME ZONE,
  -- Versioning
  version_number INT DEFAULT 1,
  parent_file_id UUID REFERENCES public.uploaded_files(id) ON DELETE SET NULL,
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- file_audit_log table: access and modification history
CREATE TABLE public.file_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'upload', 'download', 'view', 'delete', 'share', 'archive'
  performed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb
);

-- file_access_control table: fine-grained access control per file
CREATE TABLE public.file_access_control (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES public.uploaded_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL, -- 'view', 'download', 'edit', 'delete'
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(file_id, user_id, permission)
);

-- Indexes for performance
CREATE INDEX idx_uploaded_files_entity ON public.uploaded_files(associated_entity_type, associated_entity_id);
CREATE INDEX idx_uploaded_files_uploaded_by ON public.uploaded_files(uploaded_by);
CREATE INDEX idx_uploaded_files_upload_timestamp ON public.uploaded_files(upload_timestamp DESC);
CREATE INDEX idx_uploaded_files_hash ON public.uploaded_files(file_hash);
CREATE INDEX idx_uploaded_files_archived ON public.uploaded_files(is_archived);
CREATE INDEX idx_file_audit_log_file_id ON public.file_audit_log(file_id);
CREATE INDEX idx_file_audit_log_performed_by ON public.file_audit_log(performed_by);
CREATE INDEX idx_file_audit_log_timestamp ON public.file_audit_log(timestamp DESC);
CREATE INDEX idx_file_audit_log_action ON public.file_audit_log(action);
CREATE INDEX idx_file_access_control_file_id ON public.file_access_control(file_id);
CREATE INDEX idx_file_access_control_user_id ON public.file_access_control(user_id);

-- Create trigger to auto-update updated_at for uploaded_files
CREATE OR REPLACE TRIGGER trg_uploaded_files_updated_at
BEFORE UPDATE ON public.uploaded_files
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Function to automatically archive old files (optional cleanup)
CREATE OR REPLACE FUNCTION public.archive_old_files(days_old INT DEFAULT 365)
RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  UPDATE public.uploaded_files
  SET is_archived = TRUE, archived_at = NOW()
  WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    AND is_archived = FALSE;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
