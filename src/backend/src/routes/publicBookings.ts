import { Router } from 'express';
import { getSupabaseClient } from '../lib/supabase.js';
import { snakeToCamel, camelToSnake } from '../lib/transform.js';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router: import('express').Router = Router();

const PublicBookingSchema = z.object({
  patientName: z.string(),
  phone: z.string(),
  preferredDoctor: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  reason: z.string().optional(),
  registerNumber: z.string().optional(),
  appointmentType: z.enum(['chamber', 'admitted']).optional(),
  preferredChamber: z.string().optional(),
  hospitalName: z.string().optional(),
  bedWardNumber: z.string().optional(),
  admissionReason: z.string().optional(),
  referringDoctor: z.string().optional(),
});

const UpdatePublicBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
});

// Get all public bookings (authenticated staff only)
router.get(
  '/',
  authMiddleware,
  requireRole('admin', 'reception', 'medical_officer', 'doctor', 'consultant_doctor'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await getSupabaseClient()
        .from('patient_submissions')
        .select('*')
        .eq('submission_type', 'appointment_request')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const formatted = data?.map((row: any) => {
        const parsed = snakeToCamel(row);
        return {
          id: parsed.id,
          ...snakeToCamel(parsed.data || {}),
          status: parsed.status,
          submittedAt: parsed.createdAt,
        };
      });
      res.json(formatted || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
    }
  }
);

// Get public booking by ID (authenticated)
router.get(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await getSupabaseClient()
        .from('patient_submissions')
        .select('*')
        .eq('id', id)
        .eq('submission_type', 'appointment_request')
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Booking not found', code: 'NOT_FOUND' });

      const parsed = snakeToCamel(data);
      res.json({
        id: parsed.id,
        ...snakeToCamel(parsed.data || {}),
        status: parsed.status,
        submittedAt: parsed.createdAt,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
    }
  }
);

// Create public booking (PUBLIC — no auth required)
router.post('/', async (req, res) => {
  try {
    const booking = PublicBookingSchema.parse(req.body);

    const { data: created, error } = await getSupabaseClient()
      .from('patient_submissions')
      .insert([
        {
          submission_type: 'appointment_request',
          data: camelToSnake(booking),
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const parsed = snakeToCamel(created);
    res.status(201).json({
      id: parsed.id,
      ...snakeToCamel(parsed.data || {}),
      status: parsed.status,
      submittedAt: parsed.createdAt,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// Update public booking status (confirmed/cancelled)
router.patch(
  '/:id',
  authMiddleware,
  requireRole('admin', 'reception', 'medical_officer', 'doctor', 'consultant_doctor'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = UpdatePublicBookingSchema.parse(req.body);

      const { data, error } = await getSupabaseClient()
        .from('patient_submissions')
        .update({
          status: updates.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('submission_type', 'appointment_request')
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Booking not found', code: 'NOT_FOUND' });

      const parsed = snakeToCamel(data);
      res.json({
        id: parsed.id,
        ...snakeToCamel(parsed.data || {}),
        status: parsed.status,
        submittedAt: parsed.createdAt,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  }
);

// Delete public booking
router.delete(
  '/:id',
  authMiddleware,
  requireRole('admin', 'reception'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      const { error } = await getSupabaseClient()
        .from('patient_submissions')
        .delete()
        .eq('id', id)
        .eq('submission_type', 'appointment_request');

      if (error) throw error;
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  }
);

export default router;
