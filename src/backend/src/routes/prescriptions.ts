import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseClient } from '../lib/supabase.js';
import { camelToSnake, snakeToCamel } from '../lib/transform.js';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const router: import('express').Router = Router();

const PrescriptionItemSchema = z.object({
  medicineId: z.string().optional(),
  name: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration: z.number().int().positive(),
  instructions: z.string().optional(),
  route: z.string().optional(),
});

const PrescriptionSchema = z.object({
  patientId: z.string(),
  visitId: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  isDraft: z.boolean().optional().default(true),
  items: z.array(PrescriptionItemSchema).min(1),
});

const FinalizeSchema = z.object({
  emergency: z.boolean().optional().default(false),
  approvalType: z.enum(['emergency', 'financial_clearance', 'staff_finalize']).optional(),
  reason: z.string().min(10),
});

const EmergencyAccessSchema = z.object({
  reason: z.string().min(10),
});

function canFinalizePrescription(role: string, emergency: boolean, approvalType: string) {
  const clinicalApprovers = [
    'consultant_doctor',
    'doctor',
    'assistant_professor',
    'associate_professor',
    'professor',
    'medical_officer',
    'admin',
  ];

  const staffFinalizers = [
    'staff',
    'reception',
    'registrar',
    'assistant_registrar',
    'admin',
  ];

  if (emergency) {
    return ['medical_officer', 'consultant_doctor', 'doctor', 'assistant_professor', 'associate_professor', 'professor', 'admin'].includes(role);
  }

  if (approvalType === 'staff_finalize') {
    return staffFinalizers.includes(role);
  }

  return clinicalApprovers.includes(role);
}

function auditRecord(action: string, targetId: string, performedBy: string, role: string, reason: string, expiresAt?: string) {
  return {
    target_type: 'prescription',
    target_id: targetId,
    action,
    reason,
    performed_by: performedBy,
    performed_by_role: role,
    expires_at: expiresAt || null,
    metadata: {
      action,
      performedByRole: role,
    },
  };
}

// List prescriptions for a patient
router.get('/patient/:patientId', async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = getSupabaseClient();
    if (req.userRole !== 'admin' && (req.userDepartment || req.userUnit)) {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('department, unit, ward')
        .eq('id', req.params.patientId)
        .single();

      if (patientError) throw patientError;
      if (!patient) return res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });

      const unitMatches =
        req.userUnit && ['unit', 'ward'].some((field) => (patient as any)[field] === req.userUnit);

      if (patient.department && req.userDepartment && patient.department !== req.userDepartment && !unitMatches) {
        return res.status(403).json({ error: 'Department access denied', code: 'FORBIDDEN' });
      }

      if (!req.userDepartment && req.userUnit && !unitMatches) {
        return res.status(403).json({ error: 'Unit access denied', code: 'FORBIDDEN' });
      }
    }

    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, prescription_items(*)')
      .eq('patient_id', req.params.patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data ? snakeToCamel(data) : data);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
  }
});

// Create a prescription draft or active prescription
router.post(
  '/',
  requireRole(
    'consultant_doctor',
    'doctor',
    'assistant_professor',
    'associate_professor',
    'professor',
    'medical_officer',
    'intern_doctor',
    'registrar',
    'assistant_registrar',
    'admin',
  ),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = PrescriptionSchema.parse(req.body);
      const supabase = getSupabaseClient();

      const { data: newPrescription, error } = await supabase
        .from('prescriptions')
        .insert([
          camelToSnake({
            patientId: data.patientId,
            visitId: data.visitId,
            diagnosis: data.diagnosis,
            notes: data.notes,
            isDraft: data.isDraft,
          }) as any,
        ])
        .select()
        .single();

      if (error) throw error;
      if (!newPrescription) throw new Error('Failed to create prescription');

      await supabase.from('prescription_items').insert(
        data.items.map((item) =>
          camelToSnake({
            prescriptionId: newPrescription.id,
            ...item,
          }) as any,
        ),
      );

      res.status(201).json({
        ...snakeToCamel(newPrescription),
        items: data.items,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  },
);

// Finalize a prescription with approval and audit logging
router.post(
  '/:id/finalize',
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId || !req.userRole) {
        return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      }

      const { emergency, approvalType, reason } = FinalizeSchema.parse(req.body);
      const type = emergency ? 'emergency' : approvalType || 'financial_clearance';

      if (!canFinalizePrescription(req.userRole, emergency, type)) {
        return res.status(403).json({ error: 'Insufficient permissions', code: 'FORBIDDEN' });
      }

      const supabase = getSupabaseClient();
      const { data: updatedPrescription, error: updateError } = await supabase
        .from('prescriptions')
        .update({ is_draft: false, is_finalized: true } as any)
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!updatedPrescription) return res.status(404).json({ error: 'Prescription not found', code: 'NOT_FOUND' });

      const expiresAt = emergency ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() : undefined;
      await supabase.from('authorization_audit_log').insert([
        auditRecord('prescription_finalized', req.params.id, req.userId, req.userRole, reason, expiresAt),
      ]);

      res.json({ prescription: snakeToCamel(updatedPrescription), finalized: true, expiresAt: expiresAt ?? null });
    } catch (error: any) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  },
);

// Grant emergency access for a prescription and log it
router.post(
  '/:id/emergency-access',
  requireRole(
    'medical_officer',
    'consultant_doctor',
    'doctor',
    'assistant_professor',
    'associate_professor',
    'professor',
    'admin',
  ),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId || !req.userRole) {
        return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      }

      const { reason } = EmergencyAccessSchema.parse(req.body);
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      const supabase = getSupabaseClient();

      const { error } = await supabase.from('authorization_audit_log').insert([
        auditRecord('emergency_access_granted', req.params.id, req.userId, req.userRole, reason, expiresAt),
      ]);

      if (error) throw error;
      res.status(201).json({ granted: true, expiresAt });
    } catch (error: any) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  },
);

export default router;
