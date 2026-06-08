import { Router } from 'express';
import { getSupabaseClient } from '../lib/supabase.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const StoragePayloadSchema = z.object({
  value: z.unknown(),
});

router.get('/:key', async (req, res) => {
  try {
    const key = req.params.key;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('app_storage')
      .select('key, value, updated_at')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Storage key not found', code: 'NOT_FOUND' });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.put('/:key', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const key = req.params.key;
    const data = StoragePayloadSchema.parse(req.body);
    const supabase = getSupabaseClient();
    const payload = {
      key,
      value: data.value,
    };

    const { data: upserted, error } = await supabase
      .from('app_storage')
      .upsert(payload, { onConflict: 'key' })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message, code: 'DATABASE_ERROR' });
    }

    res.json(upserted);
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
  }
});

export default router;
