/**
 * Supabase Integration for Dr. Arman Kabir's Care
 * 
 * This module handles authentication and database operations via Supabase
 * while maintaining ICP canister sync for clinical data.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase environment variables not set. Auth features will be disabled.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth functions
export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

// Database functions for staff profiles
export async function createStaffProfile(staffData: {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  department: string;
  phone?: string;
}) {
  const { data, error } = await supabase
    .from('staff_profiles')
    .insert([staffData])
    .select();
  return { data, error };
}

export async function getStaffProfile(userId: string) {
  const { data, error } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

export async function updateStaffProfile(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('staff_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select();
  return { data, error };
}

// Database functions for patient records (backup/sync)
export async function syncPatientToSupabase(patientData: any) {
  const { data, error } = await supabase
    .from('patients')
    .upsert([patientData], { onConflict: 'id' })
    .select();
  return { data, error };
}

export async function getPatientFromSupabase(patientId: number) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();
  return { data, error };
}

// Audit logging
export async function logAuditEvent(eventData: {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  changes?: any;
  timestamp?: string;
}) {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert([eventData])
    .select();
  return { data, error };
}

// File uploads (for medical documents)
export async function uploadMedicalDocument(userId: string, file: File, documentType: string) {
  const fileName = `${userId}/${documentType}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('medical-documents')
    .upload(fileName, file);
  return { data, error };
}

export async function getMedicalDocumentURL(filePath: string) {
  const { data } = supabase.storage
    .from('medical-documents')
    .getPublicUrl(filePath);
  return data.publicUrl;
}
