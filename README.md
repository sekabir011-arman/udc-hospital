# Clinic Care Platform

## Overview

A Supabase-backed clinical care application with separate frontend and backend stacks.
It supports staff and patient workflows, role-based access control, appointment and admission management, vitals tracking, prescriptions, billing, and configurable branding for any clinic or hospital.

The repo structure is:
- `src/backend` — Express API, Supabase integration, JWT authentication, server-side role enforcement
- `src/frontend` — React + TypeScript + Vite UI, role-aware rendering, patient portal, and administrative tools
- `src/backend/supabase/migrations` — current Supabase SQL schema and site configuration

## Current Architecture

- Supabase stores users, profiles, patients, visits, vitals, appointments, prescriptions, and site configuration.
- Backend auth is implemented in `src/backend/src/routes/auth.ts` with JWT issuance.
- API authorization is enforced in `src/backend/src/middleware/auth.ts` using `authMiddleware` and `requireRole(...)`.
- Frontend UI permissions are mapped in `src/frontend/src/hooks/useRolePermissions.tsx`.
- Current production-ready schema files are:
  - `src/backend/supabase/migrations/001_init_schema.sql`
  - `src/backend/supabase/migrations/002_site_config.sql`

## Roles and Permissions

### Backend-recognized roles
- `admin`
- `consultant_doctor`
- `doctor`
- `assistant_professor`
- `associate_professor`
- `professor`
- `medical_officer`
- `intern_doctor`
- `nurse`
- `registrar`
- `assistant_registrar`
- `reception`
- `staff`
- `patient`

### High-level role responsibilities
- `admin`: superuser access for configuration, audit, and protected routes
- Consultant / senior doctors (`consultant_doctor`, `doctor`, `assistant_professor`, `associate_professor`, `professor`): diagnosis, prescription, admission, final approval, and clinical oversight
- `medical_officer`: clinical work with partial admission and order verification responsibilities
- `intern_doctor`: draft clinical entries, vitals, and notes with limited finalization rights
- `nurse`: medication administration, nursing notes, vitals recording, and order completion
- `registrar` / `assistant_registrar`: patient flow, bed/admission management, and broad patient access within the hospital
- `reception` / `staff`: registration, appointment scheduling, billing, and non-clinical operational support
- `patient`: portal-only access for own records, reminders, consent forms, and history

### Permission enforcement
- Server-side protection: `src/backend/src/middleware/auth.ts`
- Frontend permission rules: `src/frontend/src/hooks/useRolePermissions.tsx`
- Role aliases are normalized on login to ensure consistent `role` values in JWTs

## Schema and Data Model

Current database schema is defined in the Supabase migrations.
The supported schema includes:
- `users`
- `patients`
- `visits`
- `vitals`
- `appointments`
- `prescriptions`
- site configuration and audit tables

This repository is aligned around a single Supabase-backed schema; legacy duplicate canister/ICP architecture is not part of the recommended production deployment path.

## Frontend Branding and Customization

The hero title and organization branding are customizable.
Update visible brand text in frontend UI files such as:
- `src/frontend/src/pages/LandingPage.tsx`
- `src/frontend/src/pages/Settings.tsx`
- `API_CONFIG_REFERENCE.md` for config-driven tagline fields

Replace the default `Dr. Arman Care` branding with your clinic or hospital name to make the app organization-specific.

## Running Locally

From the repository root:
1. `pnpm install --prefer-offline`
2. `pnpm build`
3. `pnpm typecheck`

Frontend dev server:
- `cd src/frontend && pnpm dev`

Backend dev server:
- `cd src/backend && pnpm dev`

### Environment variables

Frontend (`src/frontend`):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend (`src/backend`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `JWT_EXPIRY`
- `API_PORT` (optional)

Copy `src/backend/.env.example` to `.env` and replace placeholder values with your Supabase project credentials.

## Vercel Deployment

The current Vercel config at the repository root is configured for frontend deployment only.
To deploy the frontend on Vercel:
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel environment variables.
- Use the build command: `cd src/frontend && pnpm install --prefer-offline && pnpm build`
- Output directory: `src/frontend/dist`

If you want a full production deployment, host the backend separately on a Node-capable service or convert the API into Vercel serverless functions. Backend deployment requires:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `JWT_EXPIRY`

## Useful Files

- `src/backend/src/middleware/auth.ts` — JWT auth middleware and role guards
- `src/backend/src/routes/auth.ts` — login/signup routes with Supabase-backed profile creation
- `src/frontend/src/types/index.ts` — staff and patient role definitions
- `src/frontend/src/hooks/useRolePermissions.tsx` — role-to-permission mapping
- `src/frontend/src/hooks/useEmailAuth.tsx` — frontend session/auth management for portal flows

---

This README is intended to reflect the current Supabase-based app architecture, align role enforcement with the backend system, and provide clear, production-friendly run and deployment instructions.