import { Router } from 'express';
import { getSupabaseClient } from '../lib/supabase.js';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { camelToSnake, snakeToCamel } from '../lib/transform.js';
import { z } from 'zod';

const router: import('express').Router = Router();

const PatientSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string().datetime(),
  gender: z.enum(['M', 'F', 'O']),
  phone: z.string(),
  email: z.string().email().optional(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  pastSurgicalHistory: z.string().optional(),
  medicalHistory: z.array(z.string()).optional(),
});

// Get all patients
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data ? snakeToCamel(data) : data);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
  }
});

// Get patient by ID
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('patients').select('*').eq('id', req.params.id).single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });

    const userHasDepartment = req.userDepartment && req.userRole !== 'admin';
    const userHasUnit = req.userUnit && req.userRole !== 'admin';
    const unitMatches =
      userHasUnit &&
      ['unit', 'ward'].some((field) => (data as any)[field] === req.userUnit);

    if (userHasDepartment && data.department && data.department !== req.userDepartment && !unitMatches) {
      return res.status(403).json({ error: 'Department access denied', code: 'FORBIDDEN' });
    }

    if (!userHasDepartment && userHasUnit && !unitMatches) {
      return res.status(403).json({ error: 'Unit access denied', code: 'FORBIDDEN' });
    }

    res.json(snakeToCamel(data));
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
  }
});

// Create patient
router.post('/', requireRole('admin', 'reception', 'medical_officer'), async (req: AuthenticatedRequest, res) => {
  try {
    const data = PatientSchema.parse(req.body);
    const supabase = getSupabaseClient();

    const payload = {
      ...data,
      pastSurgicalHistory:
        data.pastSurgicalHistory ??
        (data.medicalHistory ? data.medicalHistory.join(', ') : undefined),
    } as any;
    delete payload.medicalHistory;

    const { data: newPatient, error } = await supabase.from('patients').insert([camelToSnake(payload) as any]).select().single();

    if (error) throw error;
    res.status(201).json(newPatient ? snakeToCamel(newPatient) : newPatient);
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// Update patient
router.put('/:id', requireRole('admin', 'reception', 'medical_officer'), async (req: AuthenticatedRequest, res) => {
  try {
    const data = PatientSchema.partial().parse(req.body);
    const supabase = getSupabaseClient();

    const payload = {
      ...data,
      pastSurgicalHistory:
        data.pastSurgicalHistory ??
        (data.medicalHistory ? data.medicalHistory.join(', ') : undefined),
    } as any;
    delete payload.medicalHistory;

    const { data: updatedPatient, error } = await supabase
      .from('patients')
      .update(camelToSnake(payload) as any)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!updatedPatient) return res.status(404).json({ error: 'Patient not found', code: 'NOT_FOUND' });

    res.json(snakeToCamel(updatedPatient));
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

export default router;
