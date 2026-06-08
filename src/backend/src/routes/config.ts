import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/config - Get all site configuration (PUBLIC)
// ────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('section, config');

    if (error) throw error;

    // Transform into a single object keyed by section
    const config: Record<string, unknown> = {};
    if (data) {
      for (const row of data) {
        config[row.section] = row.config;
      }
    }

    res.json(config);
  } catch (err: unknown) {
    console.error('Error fetching site config:', err);
    res.status(500).json({ error: 'Failed to fetch site configuration', code: 'FETCH_ERROR' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/config/:section - Get specific section (PUBLIC)
// ────────────────────────────────────────────────────────────────────────────
router.get('/:section', async (req: Request, res: Response) => {
  try {
    const { section } = req.params;

    // Validate section name
    const validSections = ['heroSection', 'aboutSection', 'footerSection', 'emergencyContacts'];
    if (!validSections.includes(section)) {
      return res.status(400).json({ error: 'Invalid section', code: 'INVALID_SECTION' });
    }

    const { data, error } = await supabase
      .from('site_config')
      .select('section, config')
      .eq('section', section)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found
      return res.status(404).json({ error: 'Section not found', code: 'NOT_FOUND' });
    }

    if (error) throw error;

    res.json({ [section]: data.config });
  } catch (err: unknown) {
    console.error('Error fetching section:', err);
    res.status(500).json({ error: 'Failed to fetch section', code: 'FETCH_ERROR' });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/config/:section - Update specific section (ADMIN ONLY)
// ────────────────────────────────────────────────────────────────────────────
router.post(
  '/:section',
  authMiddleware,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { section } = req.params;
      const { config, reason } = req.body;

      // Validate section name
      const validSections = ['heroSection', 'aboutSection', 'footerSection', 'emergencyContacts'];
      if (!validSections.includes(section)) {
        return res.status(400).json({ error: 'Invalid section', code: 'INVALID_SECTION' });
      }

      if (!config || typeof config !== 'object') {
        return res.status(400).json({ error: 'Invalid config', code: 'INVALID_CONFIG' });
      }

      // Get current value for audit log
      const { data: existing } = await supabase
        .from('site_config')
        .select('config')
        .eq('section', section)
        .single();

      const oldValue = existing?.config;

      // Update the config
      const { error: updateError } = await supabase
        .from('site_config')
        .upsert(
          {
            section,
            config,
            updated_by: req.userId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'section' }
        );

      if (updateError) throw updateError;

      // Log the change to audit log
      const { error: auditError } = await supabase
        .from('config_audit_log')
        .insert({
          section,
          action: 'update',
          old_value: oldValue || null,
          new_value: config,
          changed_by: req.userId,
          change_reason: reason || null,
          ip_address: req.ip || req.socket.remoteAddress,
          user_agent: req.get('user-agent') || null,
        });

      if (auditError) {
        console.warn('Failed to log config change:', auditError);
        // Don't fail the request if audit logging fails
      }

      res.json({
        success: true,
        message: `${section} updated successfully`,
        section,
        config,
      });
    } catch (err: unknown) {
      console.error('Error updating config:', err);
      res.status(500).json({ error: 'Failed to update configuration', code: 'UPDATE_ERROR' });
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────
// POST /api/config/:section/reset - Reset section to default (ADMIN ONLY)
// ────────────────────────────────────────────────────────────────────────────
router.post(
  '/:section/reset',
  authMiddleware,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { section } = req.params;

      // Default values
      const defaults: Record<string, unknown> = {
        heroSection: {
          taglineEn: "Dr. Arman Kabir's Care",
          taglineBn: "ডা. আরমান কবিরের চেম্বার",
          subheadingEn: "Advanced Healthcare With a Human Touch",
          subheadingBn: "মানবিক স্পর্শে উন্নত স্বাস্থ্যসেবা",
          heroTaglineEn: "Healing with Trust and Compassion",
          heroTaglineBn: "বিশ্বাস ও সহানুভূতির সাথে নিরাময়",
          heroDescriptionEn:
            "Expert diagnosis, compassionate treatment, and trusted care for every stage of life.",
          heroDescriptionBn:
            "জীবনের প্রতিটি পর্যায়ে বিশেষজ্ঞ রোগ নির্ণয়, সহানুভূতিশীল চিকিৎসা ও বিশ্বস্ত সেবা।",
          cta1Label: "Book Appointment",
          cta2Label: "Emergency",
        },
        aboutSection: {
          visible: true,
          clinicNameEn: "Dr. Arman Kabir's Care",
          clinicNameBn: "ডা. আরমান কবিরের চেম্বার",
          descriptionEn:
            "Comprehensive patient management and medical education serving patients and students across Bangladesh.",
          descriptionBn:
            "বাংলাদেশ জুড়ে রোগী ও শিক্ষার্থীদের জন্য পূর্ণাঙ্গ রোগী ব্যবস্থাপনা ও চিকিৎসা শিক্ষা।",
          yearsExperience: 10,
          patientCount: "500+",
          doctorCount: 2,
          specialties: [
            "Internal Medicine",
            "Respiratory Medicine",
            "Diabetes & Endocrinology",
            "General Practice",
          ],
          affiliations: [
            "BSMMU",
            "DMCH",
            "Dhaka Medical College",
            "National Institute of Diseases of Chest & Hospital",
          ],
        },
        footerSection: {
          addressEn: "Dhaka, Bangladesh",
          addressBn: "ঢাকা, বাংলাদেশ",
          phone: "+880-1751-959262",
          email: "dr.armankabir011@gmail.com",
          openingHours: "Sat–Thu: 9 AM – 8 PM",
          copyrightText: "Dr. Arman Kabir's Care. All rights reserved.",
          socialLinks: [],
        },
        emergencyContacts: {
          contacts: [
            {
              doctorName: "Dr. Arman Kabir",
              whatsappNumber: "8801751959262",
              prefilledMessage: "Hello Dr. Arman, I need an emergency consultation.",
            },
            {
              doctorName: "Dr. Samia Shikder",
              whatsappNumber: "8801957212210",
              prefilledMessage: "Hello Dr. Samia, I need an emergency consultation.",
            },
          ],
        },
      };

      const validSections = Object.keys(defaults);
      if (!validSections.includes(section)) {
        return res.status(400).json({ error: 'Invalid section', code: 'INVALID_SECTION' });
      }

      const defaultConfig = defaults[section];

      // Get current value for audit log
      const { data: existing } = await supabase
        .from('site_config')
        .select('config')
        .eq('section', section)
        .single();

      const oldValue = existing?.config;

      // Reset the config
      const { error: updateError } = await supabase
        .from('site_config')
        .update({
          config: defaultConfig,
          updated_by: req.userId,
          updated_at: new Date().toISOString(),
        })
        .eq('section', section);

      if (updateError) throw updateError;

      // Log the reset to audit log
      const { error: auditError } = await supabase
        .from('config_audit_log')
        .insert({
          section,
          action: 'reset',
          old_value: oldValue || null,
          new_value: defaultConfig,
          changed_by: req.userId,
          change_reason: 'Reset to default',
          ip_address: req.ip || req.socket.remoteAddress,
          user_agent: req.get('user-agent') || null,
        });

      if (auditError) {
        console.warn('Failed to log config reset:', auditError);
      }

      res.json({
        success: true,
        message: `${section} reset to default successfully`,
        section,
        config: defaultConfig,
      });
    } catch (err: unknown) {
      console.error('Error resetting config:', err);
      res.status(500).json({ error: 'Failed to reset configuration', code: 'RESET_ERROR' });
    }
  }
);

// ────────────────────────────────────────────────────────────────────────────
// GET /api/config/audit/logs - Get audit logs (ADMIN ONLY)
// ────────────────────────────────────────────────────────────────────────────
router.get(
  '/audit/logs',
  authMiddleware,
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { section, limit = '50', offset = '0' } = req.query;

      let query = supabase
        .from('config_audit_log')
        .select(
          `
          id,
          section,
          action,
          changed_by,
          created_at,
          change_reason,
          users(name, email)
        `
        )
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (section && typeof section === 'string') {
        query = query.eq('section', section);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      res.json({
        logs: data,
        total: count,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (err: unknown) {
      console.error('Error fetching audit logs:', err);
      res.status(500).json({ error: 'Failed to fetch audit logs', code: 'FETCH_ERROR' });
    }
  }
);

export default router;
