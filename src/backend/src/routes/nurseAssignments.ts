import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseClient } from '../lib/supabase.js';
import { camelToSnake, snakeToCamel } from '../lib/transform.js';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const router: import('express').Router = Router();

const AssignmentRole = z.enum([
  'nurse',
  'intern_doctor',
  'medical_officer',
  'assistant_registrar',
  'registrar',
  'consultant',
]);

type AssignmentRoleType = z.infer<typeof AssignmentRole>;

const PatientAssignmentSchema = z.object({
  patientId: z.string().uuid(),
  nurseId: z.string().uuid(),
  assignmentRole: AssignmentRole,
  ward: z.string().min(1),
  unit: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean().optional().default(false),
  isConsulting: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

const ClaimSchema = z.object({
  notes: z.string().optional(),
});

const TransferSchema = z.object({
  toNurseId: z.string().uuid(),
  makePrimary: z.boolean().optional().default(true),
  reason: z.string().min(10),
  handoverNotes: z.string().optional(),
  clinicalSummary: z.string().optional(),
});

const ReferralSchema = z.object({
  toNurseId: z.string().uuid(),
  reason: z.string().min(10),
  notes: z.string().optional(),
  isEmergency: z.boolean().optional().default(false),
});

const ReferralStatusSchema = z.object({
  status: z.enum(['pending_review', 'accepted', 'assessment', 'recommendation_issued', 'closed']),
  notes: z.string().optional(),
});

const EmergencyAccessSchema = z.object({
  reason: z.string().min(10),
});

function mapUserRoleToAssignmentRole(role: string): AssignmentRoleType {
  if (role === 'nurse') return 'nurse';
  if (role === 'intern_doctor') return 'intern_doctor';
  if (role === 'medical_officer') return 'medical_officer';
  if (role === 'assistant_registrar') return 'assistant_registrar';
  if (role === 'registrar') return 'registrar';
  if (['consultant_doctor', 'assistant_professor', 'associate_professor', 'professor'].includes(role)) {
    return 'consultant';
  }
  throw new Error('Unsupported user role for patient assignments');
}

async function resolveTargetAssignmentRole(supabase: any, userId: string) {
  const { data: targetUser, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError) throw userError;
  if (!targetUser) throw new Error('Target user not found');
  return mapUserRoleToAssignmentRole(targetUser.role as string);
}

function buildAuditRecord(
  action: string,
  targetType: string,
  targetId: string,
  performedBy: string,
  performedByRole: string,
  reason: string,
  metadata: Record<string, unknown> = {},
  expiresAt?: string,
) {
  return {
    target_type: targetType,
    target_id: targetId,
    action,
    reason,
    performed_by: performedBy,
    performed_by_role: performedByRole,
    expires_at: expiresAt || null,
    metadata: {
      ...metadata,
      action,
      performedByRole,
    },
  };
}

async function getPatientForAccess(req: AuthenticatedRequest, supabase: any, patientId: string) {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('id, department, unit, ward')
    .eq('id', patientId)
    .single();

  if (error) throw error;
  if (!patient) return null;

  if (req.userRole === 'admin') return patient;

  const hasUnitAccess =
    req.userUnit &&
    [patient.unit, patient.ward].some((value) => value && value === req.userUnit);

  const hasDepartmentAccess =
    !req.userDepartment || !patient.department || patient.department === req.userDepartment;

  if (hasDepartmentAccess || hasUnitAccess) return patient;

  if (req.userId) {
    const { data: assignment } = await supabase
      .from('nurse_assignments')
      .select('id')
      .eq('patient_id', patientId)
      .eq('nurse_id', req.userId)
      .eq('active', true)
      .maybeSingle();

    if (assignment) return patient;
  }

  throw { status: 403, error: 'Department or unit access denied', code: 'FORBIDDEN' };
}

// Get active assignments for a patient
router.get(
  '/patient/:patientId/assignments',
  requireRole(
    'admin',
    'consultant_doctor',
    'doctor',
    'assistant_professor',
    'associate_professor',
    'professor',
    'medical_officer',
    'registrar',
    'assistant_registrar',
    'nurse',
  ),
  async (req: AuthenticatedRequest, res) => {
    try {
      const supabase = getSupabaseClient();
      const patient = await getPatientForAccess(req, supabase, req.params.patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });

      const assignmentRole = typeof req.query.assignmentRole === 'string' ? req.query.assignmentRole : undefined;
      const assignmentQuery = supabase.from('nurse_assignments').select('*').eq('patient_id', req.params.patientId);

      if (assignmentRole) {
        const parsed = AssignmentRole.safeParse(assignmentRole);
        if (!parsed.success) {
          return res.status(400).json({ error: 'Invalid assignment role filter', code: 'VALIDATION_ERROR' });
        }
        assignmentQuery.eq('assignment_role', assignmentRole);
      }

      const { data, error } = await assignmentQuery.order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data ? snakeToCamel(data) : data);
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: error.error || 'Access denied', code: error.code || 'FORBIDDEN' });
      }
      res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
    }
  },
);

// Intern doctor or medical officer claims a patient assignment
router.post(
  '/patient/:patientId/claim',
  requireRole('intern_doctor', 'medical_officer'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId || !req.userRole) {
        return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      }

      const data = ClaimSchema.parse(req.body);
      const supabase = getSupabaseClient();
      const patient = await getPatientForAccess(req, supabase, req.params.patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });

      const selectedAssignmentRole = mapUserRoleToAssignmentRole(req.userRole);
      const { data: existing } = await supabase
        .from('nurse_assignments')
        .select('id')
        .eq('patient_id', req.params.patientId)
        .eq('nurse_id', req.userId)
        .eq('assignment_role', selectedAssignmentRole)
        .eq('active', true)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ error: 'Already claimed by this clinician', code: 'ALREADY_ASSIGNED' });
      }

      await supabase
        .from('nurse_assignments')
        .update({ is_primary: false } as any)
        .eq('patient_id', req.params.patientId)
        .eq('active', true)
        .eq('assignment_role', selectedAssignmentRole);

      const assignmentPayload = {
        patientId: req.params.patientId,
        nurseId: req.userId,
        assignmentRole: selectedAssignmentRole,
        department: (patient as any).department,
        unit: (patient as any).unit,
        ward: (patient as any).ward,
        isPrimary: true,
        active: true,
        assignedBy: req.userId,
        assignedByRole: req.userRole,
        assignedAt: new Date().toISOString(),
        startAt: new Date().toISOString(),
        notes: data.notes ?? `Claimed by ${selectedAssignmentRole.replace('_', ' ')}`,
      } as any;

      const { data: newAssignment, error } = await supabase
        .from('nurse_assignments')
        .insert([camelToSnake(assignmentPayload) as any])
        .select()
        .single();

      if (error) throw error;
      if (!newAssignment) throw new Error('Failed to claim patient assignment');

      await supabase.from('authorization_audit_log').insert([
        buildAuditRecord(
          'intern_claimed',
          'nurse_assignment',
          newAssignment.id,
          req.userId,
          req.userRole,
          `Intern doctor ${req.userId} claimed patient ${req.params.patientId}`,
          {
            patientId: req.params.patientId,
            nurseId: req.userId,
            isPrimary: true,
          },
        ),
      ]);

      res.status(201).json(snakeToCamel(newAssignment));
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: error.error || 'Access denied', code: 'FORBIDDEN' });
      }
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  },
);

// Assign a nurse or intern to a patient
router.post(
  '/',
  requireRole(
    'admin',
    'consultant_doctor',
    'doctor',
    'assistant_professor',
    'associate_professor',
    'professor',
    'medical_officer',
    'registrar',
    'assistant_registrar',
  ),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = PatientAssignmentSchema.parse(req.body);
      const supabase = getSupabaseClient();
      const patient = await getPatientForAccess(req, supabase, data.patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });

      const actualAssignmentRole = await resolveTargetAssignmentRole(supabase, data.nurseId);
      if (actualAssignmentRole !== data.assignmentRole) {
        return res.status(400).json({ error: 'Assignee role mismatch', code: 'INVALID_ROLE' });
      }

      if (data.assignmentRole === 'medical_officer') {
        const permittedAssigner = [
          'admin',
          'consultant_doctor',
          'assistant_professor',
          'associate_professor',
          'professor',
          'registrar',
          'assistant_registrar',
        ];
        if (!permittedAssigner.includes(req.userRole ?? '')) {
          return res.status(403).json({ error: 'Only senior clinicians may assign medical officers', code: 'FORBIDDEN' });
        }
      }

      if (data.isPrimary) {
        await supabase
          .from('nurse_assignments')
          .update({ is_primary: false } as any)
          .eq('patient_id', data.patientId)
          .eq('active', true)
          .eq('assignment_role', data.assignmentRole);
      }

      const assignmentPayload = {
        ...data,
        assignedBy: req.userId,
        assignedByRole: req.userRole,
        assignedAt: new Date().toISOString(),
        active: true,
      } as any;

      const { data: newAssignment, error } = await supabase
        .from('nurse_assignments')
        .insert([camelToSnake(assignmentPayload) as any])
        .select()
        .single();

      if (error) throw error;
      if (!newAssignment) throw new Error('Failed to create nurse assignment');

      await supabase.from('authorization_audit_log').insert([
        buildAuditRecord(
          'patient_assigned',
          'nurse_assignment',
          newAssignment.id,
          req.userId ?? '',
          req.userRole ?? 'unknown',
          `Assigned ${data.assignmentRole} ${data.nurseId} to patient ${data.patientId}`,
          {
            patientId: data.patientId,
            nurseId: data.nurseId,
            assignmentRole: data.assignmentRole,
            isPrimary: data.isPrimary,
            isConsulting: data.isConsulting,
          },
        ),
      ]);

      res.status(201).json(snakeToCamel(newAssignment));
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: error.error || 'Access denied', code: 'FORBIDDEN' });
      }
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  },
);

// Promote an assignment to primary nurse
router.patch(
  '/:id/primary',
  requireRole(
    'admin',
    'consultant_doctor',
    'doctor',
    'assistant_professor',
    'associate_professor',
    'professor',
    'medical_officer',
    'registrar',
    'assistant_registrar',
    'nurse',
    'intern_doctor',
  ),
  async (req: AuthenticatedRequest, res) => {
    try {
      const supabase = getSupabaseClient();
      const { data: existing, error: fetchError } = await supabase
        .from('nurse_assignments')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError) throw fetchError;
      if (!existing) return res.status(404).json({ error: 'Assignment not found', code: 'NOT_FOUND' });

      await getPatientForAccess(req, supabase, existing.patient_id);

      const canPromoteSelf = req.userId === existing.nurse_id;
      const isConsultantGroup = ['consultant_doctor', 'assistant_professor', 'associate_professor', 'professor'].includes(req.userRole ?? '');
      if (!canPromoteSelf && req.userRole !== 'admin' && !(existing.assignment_role === 'consultant' && isConsultantGroup)) {
        return res.status(403).json({ error: 'Only assigned users or consultants can promote this assignment', code: 'FORBIDDEN' });
      }

      await supabase
        .from('nurse_assignments')
        .update({ is_primary: false } as any)
        .eq('patient_id', existing.patient_id)
        .eq('active', true)
        .eq('assignment_role', existing.assignment_role);

      const { data: updatedAssignment, error } = await supabase
        .from('nurse_assignments')
        .update({ is_primary: true } as any)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) throw error;
      if (!updatedAssignment) throw new Error('Failed to update nurse assignment');

      await supabase.from('authorization_audit_log').insert([
        buildAuditRecord(
          'primary_assignment_assigned',
          'nurse_assignment',
          req.params.id,
          req.userId ?? '',
          req.userRole ?? 'unknown',
          `Marked assignment ${req.params.id} as primary for role ${existing.assignment_role}`,
          { patientId: existing.patient_id, nurseId: existing.nurse_id, assignmentRole: existing.assignment_role },
        ),
      ]);

      res.json(snakeToCamel(updatedAssignment));
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: error.error || 'Access denied', code: error.code || 'FORBIDDEN' });
      }
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  },
);

// Transfer a nurse assignment to another nurse during handover
router.post(
  '/:id/transfer',
  requireRole(
    'admin',
    'consultant_doctor',
    'doctor',
    'assistant_professor',
    'associate_professor',
    'professor',
    'medical_officer',
    'registrar',
    'assistant_registrar',
    'nurse',
    'intern_doctor',
  ),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = TransferSchema.parse(req.body);
      const supabase = getSupabaseClient();
      const { data: currentAssignment, error: fetchError } = await supabase
        .from('nurse_assignments')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentAssignment) return res.status(404).json({ error: 'Assignment not found', code: 'NOT_FOUND' });

      await getPatientForAccess(req, supabase, currentAssignment.patient_id);

      const canTransferSelf = req.userId === currentAssignment.nurse_id;
      const isConsultantGroup = ['consultant_doctor', 'assistant_professor', 'associate_professor', 'professor'].includes(req.userRole ?? '');
      if (!canTransferSelf && req.userRole !== 'admin' && !(currentAssignment.assignment_role === 'consultant' && isConsultantGroup)) {
        return res.status(403).json({ error: 'Only assigned users or consultants can transfer this assignment', code: 'FORBIDDEN' });
      }

      const targetRole = await resolveTargetAssignmentRole(supabase, data.toNurseId);
      if (targetRole !== currentAssignment.assignment_role) {
        return res.status(400).json({ error: 'Transfer target must have same assignment role', code: 'INVALID_ROLE' });
      }

      await supabase
        .from('nurse_assignments')
        .update(
          camelToSnake({
            active: false,
            endAt: new Date().toISOString(),
            transferReason: data.reason,
            notes: data.handoverNotes ?? currentAssignment.notes,
            handover_from: currentAssignment.nurse_id,
            handover_to: data.toNurseId,
            handover_notes: data.handoverNotes,
            handover_at: new Date().toISOString(),
          }) as any,
        )
        .eq('id', req.params.id);

      const assignmentPayload = {
        patientId: currentAssignment.patient_id,
        nurseId: data.toNurseId,
        assignmentRole: targetRole,
        ward: currentAssignment.ward,
        unit: currentAssignment.unit,
        department: currentAssignment.department,
        isPrimary: data.makePrimary,
        notes: data.handoverNotes,
        handoverClinicalSummary: data.clinicalSummary,
        assignedBy: req.userId,
        assignedByRole: req.userRole,
        assignedAt: new Date().toISOString(),
        active: true,
      } as any;

      const { data: newAssignment, error: insertError } = await supabase
        .from('nurse_assignments')
        .insert([camelToSnake(assignmentPayload) as any])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newAssignment) throw new Error('Failed to transfer nurse assignment');

      await supabase.from('authorization_audit_log').insert([
        buildAuditRecord(
          'assignment_handover',
          'nurse_assignment',
          currentAssignment.id,
          req.userId ?? '',
          req.userRole ?? 'unknown',
          `Handover from ${currentAssignment.nurse_id} to ${data.toNurseId} for patient ${currentAssignment.patient_id}`,
          {
            patientId: currentAssignment.patient_id,
            fromNurseId: currentAssignment.nurse_id,
            toNurseId: data.toNurseId,
            assignmentRole: currentAssignment.assignment_role,
            reason: data.reason,
            handoverNotes: data.handoverNotes,
          },
        ),
      ]);

      res.json(snakeToCamel(newAssignment));
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: error.error || 'Access denied', code: error.code || 'FORBIDDEN' });
      }
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  },
);
// Consultant referral to another consultant for shared care or second opinion
router.post(
  '/:id/refer',
  requireRole('admin', 'professor', 'associate_professor', 'assistant_professor', 'consultant_doctor'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = ReferralSchema.parse(req.body);
      const supabase = getSupabaseClient();
      const { data: currentAssignment, error: fetchError } = await supabase
        .from('nurse_assignments')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentAssignment) return res.status(404).json({ error: 'Assignment not found', code: 'NOT_FOUND' });
      if (currentAssignment.assignment_role !== 'consultant') {
        return res.status(400).json({ error: 'Only consultant assignments can be referred', code: 'INVALID_ROLE' });
      }

      await getPatientForAccess(req, supabase, currentAssignment.patient_id);

      const targetRole = await resolveTargetAssignmentRole(supabase, data.toNurseId);
      if (targetRole !== 'consultant') {
        return res.status(400).json({ error: 'Referral target must be a consultant-level clinician', code: 'INVALID_ROLE' });
      }

      const now = new Date().toISOString();
      const assignmentPayload = {
        patientId: currentAssignment.patient_id,
        nurseId: data.toNurseId,
        assignmentRole: 'consultant',
        ward: currentAssignment.ward,
        unit: currentAssignment.unit,
        department: currentAssignment.department,
        isPrimary: false,
        isConsulting: true,
        referralReason: data.reason,
        referralRequestedBy: req.userId,
        referralAt: now,
        isEmergency: data.isEmergency,
        notificationSentAt: data.isEmergency ? now : null,
        referralStatus: data.isEmergency ? 'pending_review' : 'new',
        responseRequestedAt: data.isEmergency ? now : null,
        notes: data.notes,
        assignedBy: req.userId,
        assignedByRole: req.userRole,
        assignedAt: now,
        active: true,
      } as any;

      const { data: newAssignment, error: insertError } = await supabase
        .from('nurse_assignments')
        .insert([camelToSnake(assignmentPayload) as any])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newAssignment) throw new Error('Failed to create consultant referral');

      await supabase.from('authorization_audit_log').insert([
        buildAuditRecord(
          'consultant_referred',
          'nurse_assignment',
          currentAssignment.id,
          req.userId ?? '',
          req.userRole ?? 'unknown',
          `Referred consultant ${data.toNurseId} on patient ${currentAssignment.patient_id}`,
          {
            patientId: currentAssignment.patient_id,
            fromConsultantId: currentAssignment.nurse_id,
            toConsultantId: data.toNurseId,
            reason: data.reason,
            notes: data.notes,
          },
        ),
      ]);

      res.status(201).json(snakeToCamel(newAssignment));
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: error.error || 'Access denied', code: 'FORBIDDEN' });
      }
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  },
);

router.patch(
  '/:id/referral-status',
  requireRole('admin', 'professor', 'associate_professor', 'assistant_professor', 'consultant_doctor'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = ReferralStatusSchema.parse(req.body);
      const supabase = getSupabaseClient();
      const { data: currentAssignment, error: fetchError } = await supabase
        .from('nurse_assignments')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError) throw fetchError;
      if (!currentAssignment) return res.status(404).json({ error: 'Assignment not found', code: 'NOT_FOUND' });
      if (currentAssignment.assignment_role !== 'consultant') {
        return res.status(400).json({ error: 'Referral status updates only apply to consultant referrals', code: 'INVALID_ROLE' });
      }

      await getPatientForAccess(req, supabase, currentAssignment.patient_id);

      const updatePayload: Record<string, unknown> = { referral_status: data.status };
      const timestamp = new Date().toISOString();

      switch (data.status) {
        case 'pending_review':
          updatePayload.response_requested_at = timestamp;
          break;
        case 'accepted':
          updatePayload.responded_at = timestamp;
          break;
        case 'assessment':
          updatePayload.assessment_at = timestamp;
          break;
        case 'recommendation_issued':
          updatePayload.recommendation_issued_at = timestamp;
          break;
        case 'closed':
          updatePayload.closed_at = timestamp;
          break;
      }

      const { data: updatedAssignment, error: updateError } = await supabase
        .from('nurse_assignments')
        .update(updatePayload)
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (!updatedAssignment) throw new Error('Failed to update referral status');

      await supabase.from('authorization_audit_log').insert([
        buildAuditRecord(
          'referral_status_updated',
          'nurse_assignment',
          req.params.id,
          req.userId ?? '',
          req.userRole ?? 'unknown',
          `Referral status updated to ${data.status} for assignment ${req.params.id}`,
          {
            patientId: currentAssignment.patient_id,
            referralStatus: data.status,
            notes: data.notes,
          },
        ),
      ]);

      res.json(snakeToCamel(updatedAssignment));
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: error.error || 'Access denied', code: 'FORBIDDEN' });
      }
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  },
);
// Review assignment and handover audit history for a patient
router.get(
  '/patient/:patientId/audit-log',
  requireRole(
    'admin',
    'consultant_doctor',
    'doctor',
    'assistant_professor',
    'associate_professor',
    'professor',
    'medical_officer',
    'registrar',
    'assistant_registrar',
    'nurse',
    'intern_doctor',
  ),
  async (req: AuthenticatedRequest, res) => {
    try {
      const supabase = getSupabaseClient();
      const patient = await getPatientForAccess(req, supabase, req.params.patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });

      const { data, error } = await supabase
        .from('authorization_audit_log')
        .select('*')
        .contains('metadata', { patientId: req.params.patientId })
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: error.error || 'Access denied', code: 'FORBIDDEN' });
      }
      res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
    }
  },
);

// Record an emergency override access for a patient
router.post(
  '/patient/:patientId/emergency-access',
  requireRole(
    'admin',
    'consultant_doctor',
    'doctor',
    'assistant_professor',
    'associate_professor',
    'professor',
    'medical_officer',
    'nurse',
  ),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { reason } = EmergencyAccessSchema.parse(req.body);
      const supabase = getSupabaseClient();
      const patient = await getPatientForAccess(req, supabase, req.params.patientId);
      if (!patient) return res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });

      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
      await supabase.from('authorization_audit_log').insert([
        buildAuditRecord(
          'emergency_nurse_access',
          'patient',
          req.params.patientId,
          req.userId ?? '',
          req.userRole ?? 'unknown',
          reason,
          {
            patientId: req.params.patientId,
            requestedBy: req.userId,
          },
          expiresAt,
        ),
      ]);

      res.status(201).json({ granted: true, expiresAt });
    } catch (error: any) {
      if (error?.status === 403) {
        return res.status(403).json({ error: error.error || 'Access denied', code: error.code || 'FORBIDDEN' });
      }
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  },
);

export default router;
