# Supabase + Vercel Deployment Checklist

This checklist describes the steps required to deploy the `udc-hospital` app with Supabase and Vercel.

## 1. Pre-requisites

- GitHub repository connected to Vercel.
- Supabase project created.
- `pnpm` installed on your local machine.
- `Vercel` account with the project configured.

## 2. Supabase Setup

- Create a new Supabase project.
- Copy the SQL schema from `src/backend/supabase/migrations/001_init_schema.sql` into Supabase SQL Editor and run it.
- In Supabase Settings, obtain:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Confirm auth settings and row-level security rules for your tables.

## 3. Local Environment Setup

### Backend

1. Copy `src/backend/.env.example` to `src/backend/.env`.
2. Update values:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `JWT_EXPIRY`
   - `API_PORT` (default `3000`)
3. Install dependencies:
   ```bash
   cd src/backend
   pnpm install
   ```
4. Run the backend:
   ```bash
   pnpm dev
   ```

### Frontend

1. Copy `src/frontend/.env.local.example` to `src/frontend/.env.local`.
2. Update values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (backend URL, e.g. `http://localhost:3000` locally)
3. Install dependencies:
   ```bash
   cd src/frontend
   pnpm install
   ```
4. Run the frontend:
   ```bash
   pnpm dev
   ```

## 4. Vercel Deployment Configuration

### Vercel Environment Variables

Add these variables to your Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`
- `SUPABASE_URL` (backend-only, if deploying the backend separately)
- `SUPABASE_SERVICE_ROLE_KEY` (backend-only)
- `JWT_SECRET` (backend-only)
- `JWT_EXPIRY` (backend-only)
- `API_PORT` (backend-only, if the backend is deployed on Vercel)

> **Important:** Never commit production keys into source control.

### Vercel Build Settings

The repository already contains `vercel.json` with:

- `buildCommand`: `cd src/frontend && pnpm install --prefer-offline && pnpm build`
- `outputDirectory`: `src/frontend/dist`

If you deploy the frontend only, no additional Vercel build settings are required.

## 5. Backend Deployment Options

### Option A: Separate backend deployment

- Deploy the backend somewhere that supports Node.js (Vercel Serverless, a separate VM, or container).
- Ensure `VITE_API_URL` points to the backend host.
- Add backend env vars on the backend deploy target.

### Option B: Frontend-only static deployment

- Use Supabase directly from the frontend for auth and database queries.
- For API routes, the frontend still needs `VITE_API_URL` pointing to a running backend.

## 6. Final Deployment Checklist

- [ ] Supabase project created
- [ ] Supabase schema applied
- [ ] Backend `.env` configured
- [ ] Frontend `.env.local` configured
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Frontend builds successfully locally
- [ ] Vercel environment variables set
- [ ] Vercel build succeeds
- [ ] App works in production with correct `VITE_API_URL`

## 7. Notes

- The frontend uses `import.meta.env.VITE_API_URL` to call backend routes.
- The backend now supports `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Use `VITE_API_URL` on Vercel to point to the public backend URL.
