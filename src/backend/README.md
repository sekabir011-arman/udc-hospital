# Supabase Backend

Comprehensive backend for Dr. Arman Kabir's Care using Supabase and Express.js.

## Setup

### 1. Environment Configuration

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Then update `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`.

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Database Setup

Run migrations in Supabase dashboard:
- Navigate to SQL Editor
- Create new query
- Copy content from `supabase/migrations/001_init_schema.sql`
- Execute

### 4. Development

```bash
pnpm dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

### Patients (Protected)
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient

### Vitals (Protected)
- `GET /api/vitals/patient/:patientId` - Get patient vitals
- `POST /api/vitals` - Record vitals
- `PATCH /api/vitals/:id/verify` - Verify vitals status

### Appointments (Protected)
- `GET /api/appointments/patient/:patientId` - Get patient appointments
- `POST /api/appointments` - Create appointment
- `PATCH /api/appointments/:id/status` - Update appointment status

### Patient Assignments and Handover (Protected)
- `GET /api/nurse-assignments/patient/:patientId/assignments` - List role-based assignments for a patient
- `POST /api/nurse-assignments` - Assign a clinician to a patient by role (nurse, intern_doctor, medical_officer, assistant_registrar, registrar, consultant)
- `POST /api/nurse-assignments/patient/:patientId/claim` - Intern doctor or medical officer claims a patient in their department/unit
- `PATCH /api/nurse-assignments/:id/primary` - Promote a role assignment to primary responsibility
- `POST /api/nurse-assignments/:id/transfer` - Transfer role ownership during handover, including clinical summary
- `POST /api/nurse-assignments/:id/refer` - Consultant refers another consultant for second opinion or shared care, with emergency referral support
- `PATCH /api/nurse-assignments/:id/referral-status` - Update consultant referral status and response tracking
- `GET /api/nurse-assignments/patient/:patientId/audit-log` - Review assignment and handover audit history
- `POST /api/nurse-assignments/patient/:patientId/emergency-access` - Record emergency override access

## Authentication

All protected endpoints require Bearer token:

```
Authorization: Bearer <token>
```

Signup supports optional `department` and `unit` metadata for staff profiles, which are embedded in the JWT for department/unit-aware access controls.

## Role-Based Access Control

- **Admin**: Full access
- **Consultant**: Clinical access, can finalize notes
- **Registrar**: Senior medical officer access
- **Medical Officer**: Can write SOAP notes, verify vitals
- **Intern**: Can draft notes
- **Nurse**: Can record vitals and MAR
- **Reception**: Can manage appointments and billing
- **Patient**: Can view own data

## Database Schema

See `supabase/migrations/001_init_schema.sql` for full schema definition.

## Development Commands

```bash
# Type checking
pnpm typecheck

# Format and lint
pnpm fix

# Build
pnpm build

# Start production
pnpm start
```
