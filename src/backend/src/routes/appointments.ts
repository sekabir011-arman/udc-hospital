import { Router } from 'express';
import { getSupabaseClient } from '../lib/supabase.js';
import { camelToSnake, snakeToCamel } from '../lib/transform.js';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router: import('express').Router = Router();

const AppointmentSchema = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  appointmentDate: z.string().datetime(),
  duration: z.number().int().min(15),
  reason: z.string(),
  notes: z.string().optional(),
});

// Get appointments for patient
router.get('/patient/:patientId', async (req: AuthenticatedRequest, res) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', req.params.patientId)
      .order('appointment_date', { ascending: true });

    if (error) throw error;
    res.json(data ? snakeToCamel(data) : data);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
  }
});

// Create appointment
router.post('/', requireRole('reception', 'medical_officer', 'consultant_doctor', 'doctor', 'assistant_professor', 'associate_professor', 'professor', 'registrar', 'assistant_registrar'), async (req: AuthenticatedRequest, res) => {
  try {
    const data = AppointmentSchema.parse(req.body);
    const supabase = getSupabaseClient();

    const { data: newAppointment, error } = await supabase
      .from('appointments')
      .insert([
        camelToSnake({
          ...data,
          status: 'scheduled',
        }) as any,
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(newAppointment ? snakeToCamel(newAppointment) : newAppointment);
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// Update appointment status
router.patch('/:id/status', requireRole('reception', 'medical_officer', 'consultant_doctor', 'doctor', 'assistant_professor', 'associate_professor', 'professor', 'registrar', 'assistant_registrar'), async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = z.object({ status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']) }).parse(req.body);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('appointments')
      .update({ status } as any)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Appointment not found', code: 'NOT_FOUND' });

    res.json(snakeToCamel(data));
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

export default router;
