import { Router, Request, Response } from 'express';
import { getSupabaseClient } from '../lib/supabase.js';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';

const router: import('express').Router = Router();

const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum([
    'admin',
    'professor',
    'associate_professor',
    'assistant_professor',
    'consultant_doctor',
    'doctor',
    'registrar',
    'assistant_registrar',
    'medical_officer',
    'intern_doctor',
    'nurse',
    'reception',
    'staff',
    'patient',
  ]),
  department: z.string().optional(),
  unit: z.string().optional(),
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

    // Create user profile
    const { error: profileError } = await supabase.from('users').insert([
      {
        id: authData.user.id,
        email: data.email,
        name: data.name,
        role: data.role,
        department: data.department ?? null,
        unit: data.unit ?? null,
      } as any,
    ]);

    if (profileError) {
      return res.status(400).json({ error: profileError.message, code: 'PROFILE_ERROR' });
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
      { sub: authData.user.id, email: data.email, role: data.role },
      jwtSecret as jwt.Secret,
      { expiresIn: process.env.JWT_EXPIRY || '7d' } as any,
    );

    res.json({
      user: {
        id: authData.user.id,
        email: data.email,
        name: data.name,
        role: data.role,
        department: data.department ?? null,
        unit: data.unit ?? null,
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
    const { data: userProfile, error: profileError } = (await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()) as any;

    if (profileError || !userProfile) {
      return res.status(404).json({ error: 'User profile not found', code: 'PROFILE_NOT_FOUND' });
    }

    const normalizedRole = ((role: string | undefined) => {
      if (!role) return undefined;
      return {
        consultant: 'consultant_doctor',
        intern: 'intern_doctor',
        assistant_registrar: 'assistant_registrar',
        assistant_professor: 'assistant_professor',
        associate_professor: 'associate_professor',
        doctor: 'doctor',
        staff: 'staff',
        reception: 'reception',
        medical_officer: 'medical_officer',
        nurse: 'nurse',
        admin: 'admin',
        patient: 'patient',
      }[role] ?? role;
    })(userProfile.role);

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
      {
        sub: authData.user.id,
        email: userProfile.email,
        role: normalizedRole,
        department: userProfile.department ?? null,
      },
      jwtSecret as jwt.Secret,
      { expiresIn: process.env.JWT_EXPIRY || '7d' } as any,
    );

    res.json({
      user: {
        ...userProfile,
        role: normalizedRole,
        department: userProfile.department ?? null,
        unit: userProfile.unit ?? null,
      },
      token,
      expiresIn: 604800,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'VALIDATION_ERROR' });
  }
});

export default router;
