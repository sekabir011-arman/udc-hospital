import { Router } from 'express';
import { getSupabaseClient } from '../lib/supabase.js';
import { snakeToCamel, camelToSnake } from '../lib/transform.js';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router: import('express').Router = Router();

const ReceiptSchema = z.object({
  patientId: z.string().optional(),
  patientName: z.string(),
  registerNumber: z.string().optional(),
  amount: z.number().min(0),
  finalAmount: z.number().min(0).optional(),
  discountRate: z.number().min(0).max(100).optional(),
  paymentMethod: z.enum(['cash', 'bkash', 'nagad', 'card']).optional(),
  invoiceState: z.enum(['paid', 'unpaid', 'partial']).optional(),
  paid: z.boolean().optional(),
  notes: z.string().optional(),
  receiptType: z.enum(['appointment', 'procedure', 'investigation', 'other']).optional(),
});

// Get patient's receipts
router.get('/patient/:patientId', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { patientId } = req.params;
    const { data, error } = await getSupabaseClient()
      .from('money_receipts')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json(data ? data.map(snakeToCamel) : []);
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
  }
});

// Get all receipts (admin only)
router.get(
  '/',
  authMiddleware,
  requireRole('admin', 'medical_officer'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { from, to } = req.query;
      let query = getSupabaseClient().from('money_receipts').select('*');

      if (from && typeof from === 'string') {
        query = query.gte('date', new Date(from).toISOString());
      }
      if (to && typeof to === 'string') {
        query = query.lte('date', new Date(to).toISOString());
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      res.json(data ? data.map(snakeToCamel) : []);
    } catch (error: any) {
      res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
    }
  }
);

// Get receipt by ID
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await getSupabaseClient()
      .from('money_receipts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Receipt not found', code: 'NOT_FOUND' });

    res.json(snakeToCamel(data));
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
  }
});

// Create receipt
router.post(
  '/',
  authMiddleware,
  requireRole('reception', 'medical_officer', 'doctor', 'consultant_doctor'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const data = ReceiptSchema.parse(req.body);

      const receiptData: any = {
        ...camelToSnake(data),
        date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // Generate receipt number if not provided
      if (!req.body.receiptNumber) {
        const year = new Date().getFullYear();
        const counter = Math.floor(Math.random() * 10000);
        receiptData.receipt_number = `REC-${year}-${String(counter).padStart(4, '0')}`;
      } else {
        receiptData.receipt_number = req.body.receiptNumber;
      }

      const { data: created, error } = await getSupabaseClient()
        .from('money_receipts')
        .insert([receiptData])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(snakeToCamel(created));
    } catch (error: any) {
      res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
    }
  }
);

// Update receipt
router.patch('/:id', authMiddleware, requireRole('reception', 'medical_officer'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updates = ReceiptSchema.partial().parse(req.body);

    const { data, error } = await getSupabaseClient()
      .from('money_receipts')
      .update({
        ...camelToSnake(updates),
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Receipt not found', code: 'NOT_FOUND' });

    res.json(snakeToCamel(data));
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// Delete receipt
router.delete('/:id', authMiddleware, requireRole('admin', 'medical_officer'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const { error } = await getSupabaseClient()
      .from('money_receipts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

export default router;
