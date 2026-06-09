# Dr. Arman Care App

## Project Overview

This repository powers a clinical care platform with multiple user roles, patient management, appointment workflows, vitals tracking, and staff/admin dashboards.

The application is split into:
- `src/backend` — Express-style API routes, Supabase integration, role-based authorization
- `src/frontend` — React + TypeScript UI, role-aware page rendering, patient reminders, clinical tools

## User Roles and Responsibilities

### 1. Admin
- Full access to configuration and audit features
- Can manage site settings, emergency contact data, and backend-protected sections
- Treated as a full clinical/admin role in permission checks
- Backend enforcement: `requireRole('admin')`

### 2. Consultant / Doctor Roles
These are senior clinical roles with broad decision-making authority:
- `consultant_doctor`
- `doctor`
- `assistant_professor`
- `associate_professor`
- `professor`

Common capabilities:
- Diagnose patients
- Prescribe and finalize prescriptions
- Discharge patients
- Approve intern notes and review clinical work
- Manage admissions and bed assignments
- Can view and act on most patient records

### 3. Medical Officer
- `medical_officer`
- Clinical user who can diagnose, prescribe, record vitals, and manage admissions in a partial capacity
- Can verify and complete orders, but has fewer override privileges than consultants

### 4. Registrar / Assistant Registrar
- `registrar`
- `assistant_registrar`
- Administrative clinical user with broad patient-view access
- Can approve intern work, manage beds and admissions, and support patient flow
- Registrar has the highest non-admin hospital workflow access

### 5. Intern Doctor
- `intern_doctor`
- Junior clinical role
- Can record clinical notes, draft prescriptions, and enter vitals
- Cannot finalize prescriptions, discharge patients, or approve senior work

### 6. Nurse
- `nurse`
- Focused on nursing workflows, medication administration, vitals recording, and nursing notes
- Can complete orders and record medication administration status

### 7. Reception / Staff
- `reception`
- `staff`
- Front desk and operational roles responsible for:
  - Patient registration
  - Appointment scheduling
  - Billing and administrative support
  - Basic patient record access (not clinical decision-making)

### 8. Patient
- `patient`
- Can access patient-facing features like reminders, consent forms, and their own data
- No clinical or administrative permissions in the staff workflow

## Permission Model

The frontend uses `src/frontend/src/hooks/useRolePermissions.tsx` to map each `StaffRole` into a `RolePermissions` object.

Key permission categories include:
- `canPrescribe`
- `canDiagnose`
- `canDischarge`
- `canAdministerMeds`
- `canRecordVitals`
- `canRegisterPatients`
- `canManageBilling`
- `canViewAllPatients`
- `canViewAuditTrail`
- `canManageAdmissions`

`admin` is treated as a superuser, while `patient` is the most restricted role.

## Auth and Authorization

### Backend
- Backend auth is managed in `src/backend/src/routes/auth.ts`
- Supported role values:
  - `patient`, `nurse`, `intern`, `medical_officer`, `registrar`, `consultant`, `reception`, `admin`
- JWTs are generated with `sub`, `email`, and `role` claims
- Middleware in `src/backend/src/middleware/auth.ts` sets `req.userId` and `req.userRole`
- Authorization is enforced with `requireRole(...)`

### Frontend
- Frontend role-aware UI is built around `src/frontend/src/hooks/useRolePermissions.tsx`
- Current auth context is handled in `src/frontend/src/hooks/useEmailAuth.tsx`
- That hook stores registrations and session state in localStorage for doctor/staff and patient accounts
- Patient and doctor user flows are distinct, and the app uses role-based UI gating to show appropriate panels

## What This Means in Practice

- Clinical workflows are separated by role: doctors and nurses see different tools than reception staff
- Senior users can finalize and approve work that junior users can only draft
- Admin users can edit configuration and access protected audit/config routes
- Patients can use reminder and patient portal features without clinical staff privileges

## How to Run

From the repository root:
- `pnpm install --prefer-offline`
- `pnpm build`

If you need backend-only commands:
- `cd src/backend && mops install`
- `cd src/backend && mops build`

## Notes

- The current repository includes both a backend JWT auth implementation and a frontend localStorage-based auth implementation.
- The role system is rich and supports many clinical titles, but the app still relies on local session state in the frontend for the visible patient/doctor portal flows.

## Useful Files

- `src/backend/src/middleware/auth.ts` — role-based authorization helper
- `src/backend/src/routes/auth.ts` — login/signup with role assignment
- `src/frontend/src/types/index.ts` — role definitions and labels
- `src/frontend/src/hooks/useRolePermissions.tsx` — permission mapping by role
- `src/frontend/src/hooks/useEmailAuth.tsx` — auth/session management for staff and patients

---

This README is designed to help you understand who each user in your app is and what they can do.