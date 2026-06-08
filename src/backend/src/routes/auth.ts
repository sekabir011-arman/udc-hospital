import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../lib/supabase.js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authMiddleware, requireRole, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum([
    'admin',
    'consultant',
    'consultant_doctor',
    'doctor',
    'assistant_professor',
    'associate_professor',
    'professor',
    'medical_officer',
    'assistant_registrar',
    'registrar',
    'intern',
    'intern_doctor',
    'nurse',
    'reception',
    'staff',
    'patient',
  ]),
});

// Sign Up
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const data = SignupSchema.parse(req.body);
    const supabase = getSupabaseClient();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message, code: 'AUTH_ERROR' });
    }

    // Create user profile (staff/non-admin accounts start as pending)
    const isAdmin = data.role === 'admin';
    const { error: profileError } = await supabase.from('users').insert([
      {
        id: authData.user.id,
        email: data.email,
        name: data.name,
        role: data.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: isAdmin ? 'active' : 'pending',
      },
    ]);

    if (profileError) {
      return res.status(400).json({ error: profileError.message, code: 'PROFILE_ERROR' });
    }

    // For non-admin accounts, return pending message
    if (!isAdmin) {
      return res.status(202).json({
        message: 'Account created! Please wait for admin approval before logging in.',
        status: 'pending_approval',
        user: {
          id: authData.user.id,
          email: data.email,
          name: data.name,
          role: data.role,
        },
      });
    }

    // Generate JWT for admin users only
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Missing JWT_SECRET in backend configuration', code: 'SERVER_ERROR' });
    }

    const token = jwt.sign(
      { sub: authData.user.id, email: data.email, role: data.role },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.json({
      user: {
        id: authData.user.id,
        email: data.email,
        name: data.name,
        role: data.role,
      },
      token,
      expiresIn: 604800, // 7 days in seconds
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// Sign In
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data = AuthSchema.parse(req.body);
    const supabase = getSupabaseClient();

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(404).json({ error: 'User profile not found', code: 'PROFILE_NOT_FOUND' });
    }

    // Check status: only active/approved accounts can login
    const status = (userProfile.status as string) || 'active';
    if (status === 'pending') {
      return res.status(403).json({
        error: 'Your account is pending admin approval. Please wait.',
        code: 'PENDING_APPROVAL',
      });
    }
    if (status === 'rejected') {
      return res.status(403).json({
        error: 'Your account has been rejected. Please contact the admin.',
        code: 'ACCOUNT_REJECTED',
      });
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Missing JWT_SECRET in backend configuration', code: 'SERVER_ERROR' });
    }

    const token = jwt.sign(
      { sub: authData.user.id, email: userProfile.email, role: userProfile.role },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.json({
      user: userProfile,
      token,
      expiresIn: 604800,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS - Staff Approval Workflow
// ═══════════════════════════════════════════════════════════

// Get all pending users (staff/non-patients) for admin approval
router.get('/users/pending', authMiddleware, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, status, created_at')
      .eq('status', 'pending')
      .neq('role', 'patient')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message, code: 'QUERY_ERROR' });
    }

    res.json({
      data,
      count: data?.length || 0,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
});

// Get all users with optional filtering
router.get('/users', authMiddleware, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const { role, status } = req.query;

    let query = supabase.from('users').select('id, email, name, role, status, phone, created_at');

    if (role && typeof role === 'string') {
      query = query.eq('role', role);
    }
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message, code: 'QUERY_ERROR' });
    }

    res.json({
      data,
      count: data?.length || 0,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
});

// Get specific user details
router.get('/users/:userId', authMiddleware, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }

    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
});

// Update user status (approve/reject/disable accounts)
router.patch('/users/:userId/status', authMiddleware, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { status: newStatus } = req.body;

    // Validate status
    const validStatuses = ['pending', 'active', 'approved', 'rejected', 'disabled'];
    if (!newStatus || !validStatuses.includes(newStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        code: 'INVALID_STATUS',
      });
    }

    const supabase = getSupabaseClient();

    // Update user status
    const { data, error } = await supabase
      .from('users')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(400).json({ error: error?.message || 'Failed to update user', code: 'UPDATE_ERROR' });
    }

    // Log audit trail
    console.log(`[ADMIN ACTION] ${req.userId} changed ${userId} status from pending to ${newStatus}`);

    res.json({
      message: `User status updated to '${newStatus}'`,
      user: data,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
});

// Approve multiple users in bulk
router.post('/users/bulk/approve', authMiddleware, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'userIds must be a non-empty array',
        code: 'INVALID_INPUT',
      });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .in('id', userIds)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message, code: 'UPDATE_ERROR' });
    }

    console.log(`[ADMIN ACTION] ${req.userId} approved ${userIds.length} users in bulk`);

    res.json({
      message: `Successfully approved ${data?.length || 0} users`,
      updated: data,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
});

// Reject multiple users in bulk
router.post('/users/bulk/reject', authMiddleware, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'userIds must be a non-empty array',
        code: 'INVALID_INPUT',
      });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .in('id', userIds)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message, code: 'UPDATE_ERROR' });
    }

    console.log(`[ADMIN ACTION] ${req.userId} rejected ${userIds.length} users in bulk`);

    res.json({
      message: `Successfully rejected ${data?.length || 0} users`,
      updated: data,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'INTERNAL_ERROR' });
  }
});

export default router;
