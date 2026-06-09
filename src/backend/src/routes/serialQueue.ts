import { Router } from 'express';
import { getSupabaseClient } from '../lib/supabase.js';
import { snakeToCamel, camelToSnake } from '../lib/transform.js';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router: import('express').Router = Router();

const SerialQueueEntrySchema = z.object({
  patientId: z.string().optional(),
  patientName: z.string(),
  phone: z.string().optional(),
  serialNumber: z.number().int().positive(),
  status: z.enum(['waiting', 'in-progress', 'done']),
  arrivalTime: z.string().optional(),
  queueDate: z.string().optional(), // YYYY-MM-DD
});

const UpdateSerialQueueEntrySchema = z.object({
  status: z.enum(['waiting', 'in-progress', 'done']).optional(),
  calledAt: z.string().optional(),
});

// Get today's serial queue (PUBLIC — for serial display screen)
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await getSupabaseClient()
      .from('serial_queue_entries')
      .select('*')
      .eq('queue_date', today)
      .order('serial_number', { ascending: true });

    if (error) throw error;
    res.json(data ? data.map(snakeToCamel) : []);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
  }
});

// Get serial queue for specific date
router.get('/date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { data, error } = await getSupabaseClient()
      .from('serial_queue_entries')
      .select('*')
      .eq('queue_date', date)
      .order('serial_number', { ascending: true });

    if (error) throw error;
    res.json(data ? data.map(snakeToCamel) : []);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
  }
});

// Create serial queue entry
router.post(
  '/',
  authMiddleware,
  requireRole('reception', 'doctor', 'consultant_doctor', 'medical_officer'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = SerialQueueEntrySchema.parse(req.body);
      const today = new Date().toISOString().slice(0, 10);

      const { data: created, error } = await getSupabaseClient()
        .from('serial_queue_entries')
        .insert([
          camelToSnake({
            ...data,
            queue_date: data.queueDate || today,
            added_at: new Date().toISOString(),
          }) as any,
        ])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(snakeToCamel(created));
    } catch (error: any) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  }
);

// Update serial queue entry status
router.patch(
  '/:id',
  authMiddleware,
  requireRole('reception', 'doctor', 'consultant_doctor', 'medical_officer'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = UpdateSerialQueueEntrySchema.parse(req.body);

      const patch: any = {};
      if (updates.status) patch.status = updates.status;
      if (updates.calledAt) patch.called_at = updates.calledAt;
      patch.updated_at = new Date().toISOString();

      const { data, error } = await getSupabaseClient()
        .from('serial_queue_entries')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Queue entry not found', code: 'NOT_FOUND' });

      res.json(snakeToCamel(data));
    } catch (error: any) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  }
);

// Delete serial queue entry
router.delete(
  '/:id',
  authMiddleware,
  requireRole('reception', 'doctor', 'consultant_doctor', 'medical_officer'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      const { error } = await getSupabaseClient()
        .from('serial_queue_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true, id });
    } catch (error: any) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  }
);

// Reset queue for a date (delete all entries)
router.delete(
  '/date/:date',
  authMiddleware,
  requireRole('admin', 'doctor', 'consultant_doctor'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { date } = req.params;

      const { error } = await getSupabaseClient()
        .from('serial_queue_entries')
        .delete()
        .eq('queue_date', date);

      if (error) throw error;
      res.json({ success: true, message: `Queue reset for ${date}` });
    } catch (error: any) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  }
);

export default router;
