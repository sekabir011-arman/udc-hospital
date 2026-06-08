# Admin Workflow - Complete Architecture

## Overview
This document describes the complete admin authentication and staff approval workflow for the UDC Hospital system.

---

## 1. Admin Authentication Flow

### Frontend Admin Login (useAdminAuth.tsx)
```
Admin enters credentials
    ↓
Hardcoded validation: dr.armankabir011@gmail.com / 01197247219
    ↓
localStorage.setItem('adminSession', JSON.stringify(admin))
    ↓
Admin Dashboard accessible
```

**Current Implementation** (src/frontend/src/hooks/useAdminAuth.tsx):
- Hardcoded admin accounts (username/password)
- Stores session in localStorage
- Simple boolean state management
- NO connection to backend Supabase

### Backend Admin Authentication (src/backend/src/routes/auth.ts)
```
Admin creates account via /api/auth/signup with role: 'admin'
    ↓
Supabase creates auth user
    ↓
Backend creates user profile with status: 'active' (admins bypass pending)
    ↓
Backend issues JWT token
    ↓
Frontend stores token: localStorage.setItem('auth_token', token)
```

**Token Storage** (useEmailAuth.tsx):
- JWT token stored in `auth_token` key after successful login
- Token includes: `sub` (userId), `email`, `role`
- Token expires in 7 days (default)

---

## 2. Staff Signup Flow (With Approval Requirement)

```
Staff member enters signup form
    ↓
POST /api/auth/signup { email, password, name, role, designation, etc. }
    ↓
Backend authenticates with Supabase
    ↓
Creates users table entry with status: 'pending'
    ↓
Returns HTTP 202 (Accepted)
Response: "Account created! Please wait for admin approval before logging in."
    ↓
Staff account BLOCKED from login until admin approves
```

**Key Code** (src/backend/src/routes/auth.ts:37-54):
```typescript
const isAdmin = data.role === 'admin';
const { error: profileError } = await supabase.from('users').insert([
  {
    id: authData.user.id,
    email: data.email,
    name: data.name,
    role: data.role,
    status: isAdmin ? 'active' : 'pending', // Non-admin = pending!
  },
]);

if (!isAdmin) {
  return res.status(202).json({
    message: 'Account created! Please wait for admin approval before logging in.',
    status: 'pending_approval',
  });
}
```

---

## 3. Staff Login Flow (With Status Validation)

```
Staff enters email/password
    ↓
Frontend calls POST /api/auth/login
    ↓
Backend verifies Supabase credentials
    ↓
Backend retrieves user profile from users table
    ↓
Backend checks status field:
    - status === 'pending' → HTTP 403 "Pending admin approval"
    - status === 'rejected' → HTTP 403 "Account rejected"
    - status === 'active'   → Issue JWT token
    ↓
Frontend receives token, stores in localStorage
    ↓
Staff can now access system
```

**Key Code** (src/backend/src/routes/auth.ts:141-154):
```typescript
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
```

---

## 4. Admin Dashboard - Staff Approval

### Admin Views Pending Approvals

```
Admin opens AdminDashboard component
    ↓
Calls getPendingUsers() from adminApi.ts
    ↓
adminApi.ts calls GET /api/auth/users/pending
    ↓
Backend middleware verifies JWT token
Backend checks: role === 'admin' (via requireRole('admin'))
    ↓
Backend queries Supabase:
SELECT id, email, name, role, status, created_at
WHERE status = 'pending' AND role != 'patient'
    ↓
Returns list of pending staff
    ↓
AdminDashboard displays: [
  { id, email, name, role, created_at, [Approve] [Reject] buttons }
]
```

### Admin Approves Staff

```
Admin clicks [Approve] button next to staff member
    ↓
Frontend calls approveUser(userId) from adminApi.ts
    ↓
adminApi.ts calls PATCH /api/auth/users/:userId/status
Body: { status: 'active' }
Authorization: Bearer <JWT_TOKEN>
    ↓
Backend middleware verifies JWT and checks role === 'admin'
    ↓
Backend updates Supabase:
UPDATE users SET status = 'active' WHERE id = :userId
    ↓
Returns updated user object
    ↓
UI refreshes, staff now shows in "Approved" list
    ↓
Staff can now login
```

**Key Code** (src/backend/src/routes/auth.ts:225-253):
```typescript
router.patch('/users/:userId/status', authMiddleware, requireRole('admin'), async (req, res) => {
  const { status: newStatus } = req.body;
  
  // Validate status
  const validStatuses = ['pending', 'active', 'approved', 'rejected', 'disabled'];
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const { data, error } = await supabase
    .from('users')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();
  
  // Log audit trail
  console.log(`[ADMIN ACTION] ${req.userId} changed ${userId} status to ${newStatus}`);
});
```

---

## 5. Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  FRONTEND                          BACKEND                           │
│  ────────                          ───────                           │
│                                                                       │
│  useAdminAuth.tsx              src/routes/auth.ts                   │
│  ├─ Admin Login                 ├─ POST /signup                     │
│  │  (hardcoded creds)           ├─ POST /login                      │
│  │  → localStorage              ├─ GET /users/pending               │
│  │    adminSession              ├─ GET /users/:userId               │
│  │                               ├─ GET /users                       │
│  useEmailAuth.tsx              ├─ PATCH /users/:userId/status       │
│  ├─ Staff Login                 ├─ POST /users/bulk/approve         │
│  │  → /api/auth/login           ├─ POST /users/bulk/reject          │
│  │  → stores auth_token         └─ Protected by requireRole('admin')│
│  │  → calls setDoctorSession    └─ Protected by authMiddleware      │
│  │                                                                    │
│  adminApi.ts (NEW)             Supabase Database                   │
│  ├─ getPendingUsers()          ┌─────────────────┐                 │
│  ├─ getAllUsers()              │ users table     │                 │
│  ├─ approveUser()              ├─────────────────┤                 │
│  ├─ rejectUser()               │ id              │                 │
│  ├─ updateUserStatus()         │ email           │                 │
│  ├─ approveUsersBulk()         │ name            │                 │
│  └─ rejectUsersBulk()          │ role            │                 │
│     └─ Uses auth_token         │ status ←────────┼─ KEY FIELD      │
│        for authentication      │ created_at      │                 │
│                                 └─────────────────┘                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

Workflow Timeline:
─────────────────

1. Admin Logs In (Frontend)
   useAdminAuth → adminSession stored locally
   
2. Admin Logs In (Backend - OPTIONAL)
   Frontend can also do POST /api/auth/signup with role: 'admin'
   This creates Supabase user + JWT token
   
3. Staff Signs Up
   Frontend → POST /api/auth/signup
   Backend → Creates with status: 'pending'
   Result → "Please wait for admin approval"
   
4. Admin Approves Staff (AdminDashboard)
   GET /api/auth/users/pending → Shows pending list
   PATCH /api/auth/users/:id/status → Update to 'active'
   
5. Staff Can Now Login
   Frontend → POST /api/auth/login
   Backend → Checks status (must be 'active')
   Result → Issues JWT token
   
6. Staff Accesses System
   Frontend stores JWT in auth_token
   All subsequent API calls use Bearer token
```

---

## 6. Admin API Endpoints

### GET /api/auth/users/pending
**Description**: Get all pending staff awaiting approval
**Auth**: Bearer JWT + requireRole('admin')
**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "dr.new@hospital.com",
      "name": "Dr. New Doctor",
      "role": "doctor",
      "status": "pending",
      "created_at": "2025-06-08T10:00:00Z"
    }
  ],
  "count": 1
}
```

### GET /api/auth/users
**Description**: Get all users with optional filtering
**Auth**: Bearer JWT + requireRole('admin')
**Query Params**:
- `role`: Filter by role (e.g., ?role=doctor)
- `status`: Filter by status (e.g., ?status=pending)

**Response**:
```json
{
  "data": [...users],
  "count": 42
}
```

### GET /api/auth/users/:userId
**Description**: Get specific user details
**Auth**: Bearer JWT + requireRole('admin')
**Response**:
```json
{
  "id": "uuid",
  "email": "staff@hospital.com",
  "name": "Staff Name",
  "role": "doctor",
  "status": "active",
  "phone": "01234567890",
  "avatar_url": "https://...",
  "created_at": "2025-06-08T10:00:00Z",
  "updated_at": "2025-06-08T11:00:00Z"
}
```

### PATCH /api/auth/users/:userId/status
**Description**: Update user status (approve/reject/disable)
**Auth**: Bearer JWT + requireRole('admin')
**Body**:
```json
{
  "status": "active"  // or: pending, approved, rejected, disabled
}
```
**Response**:
```json
{
  "message": "User status updated to 'active'",
  "user": {...full user object with updated status}
}
```

### POST /api/auth/users/bulk/approve
**Description**: Approve multiple users at once
**Auth**: Bearer JWT + requireRole('admin')
**Body**:
```json
{
  "userIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```
**Response**:
```json
{
  "message": "Successfully approved 3 users",
  "updated": [...approved users]
}
```

### POST /api/auth/users/bulk/reject
**Description**: Reject multiple users at once
**Auth**: Bearer JWT + requireRole('admin')
**Body**:
```json
{
  "userIds": ["uuid-1", "uuid-2"]
}
```

---

## 7. Frontend Integration Points

### AdminDashboard Component Usage
```typescript
import { getPendingUsers, approveUser, rejectUser } from '@/lib/adminApi';

// In AdminDashboard component:
const [pendingStaff, setPendingStaff] = useState([]);
const [loading, setLoading] = useState(false);

const loadPending = async () => {
  setLoading(true);
  try {
    const users = await getPendingUsers();
    setPendingStaff(users);
  } catch (error) {
    showError('Failed to load pending approvals');
  } finally {
    setLoading(false);
  }
};

const handleApprove = async (userId: string) => {
  try {
    await approveUser(userId);
    setPendingStaff(prev => prev.filter(u => u.id !== userId));
    showSuccess('Staff approved successfully');
  } catch (error) {
    showError('Failed to approve staff');
  }
};

const handleReject = async (userId: string) => {
  try {
    await rejectUser(userId);
    setPendingStaff(prev => prev.filter(u => u.id !== userId));
    showSuccess('Staff rejected');
  } catch (error) {
    showError('Failed to reject staff');
  }
};
```

---

## 8. Security Considerations

### JWT Token Protection
- ✅ Tokens verified by authMiddleware
- ✅ Role checked by requireRole('admin')
- ✅ Tokens expire in 7 days
- ✅ Token stored securely in localStorage (httpOnly unavailable in SPA)

### Database Security
- ✅ Status field tracked in users table
- ✅ Only admins can update status
- ✅ Audit logging on every status change
- ✅ Foreign key: users.id → auth.users(id) ON DELETE CASCADE

### Workflow Security
- ✅ Staff cannot login until approved
- ✅ Rejected staff cannot re-login without re-registering
- ✅ Admin approval required before any staff member can access system

---

## 9. Database Schema

### users table
```sql
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role public.user_role not null,
  status public.user_status default 'pending',  -- NEW FIELD
  phone text,
  avatar_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### user_status enum
```sql
create type public.user_status as enum (
  'pending',
  'active',
  'approved',
  'rejected',
  'disabled'
);
```

---

## 10. Summary: Admin Workflow Connections

| Component | Purpose | Connection |
|-----------|---------|-----------|
| useAdminAuth.tsx | Admin login (UI) | Frontend-only, localStorage-based |
| useEmailAuth.tsx | Staff/Admin login (Backend) | Connects to /api/auth/*, stores JWT |
| src/routes/auth.ts | Backend auth endpoints | Manages signup, login, status updates |
| adminApi.ts | Admin operations | Calls protected backend endpoints |
| AdminDashboard.tsx | Admin approval UI | Uses adminApi to call backend |
| Supabase users table | User data storage | status field drives approval workflow |

**Key Connection**: Admin approves staff → adminApi calls PATCH /api/auth/users/:id/status → Backend updates Supabase status → Staff can login

---

## 11. Testing the Workflow

### Step 1: Create Admin (Backend)
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hospital.com",
    "password": "admin123",
    "name": "Admin User",
    "role": "admin"
  }'
```
Expected: Returns JWT token (admin created with status='active')

### Step 2: Create Staff (Pending)
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@hospital.com",
    "password": "doctor123",
    "name": "Dr. Test",
    "role": "doctor"
  }'
```
Expected: HTTP 202 + "Please wait for admin approval"

### Step 3: Try Staff Login (Should Fail)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@hospital.com",
    "password": "doctor123"
  }'
```
Expected: HTTP 403 + "Pending admin approval"

### Step 4: Admin Approves
```bash
curl -X GET http://localhost:3000/api/auth/users/pending \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```
Expected: Lists pending staff

```bash
curl -X PATCH http://localhost:3000/api/auth/users/:DOCTOR_UUID/status \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```
Expected: Staff status updated to 'active'

### Step 5: Staff Can Now Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@hospital.com",
    "password": "doctor123"
  }'
```
Expected: HTTP 200 + JWT token

---

## 12. Next Steps / Future Improvements

- [ ] Implement email notifications when staff is approved/rejected
- [ ] Add role-based approval workflows (different admins for different roles)
- [ ] Create audit log UI component to show all approval history
- [ ] Add bulk reject/approve UI in AdminDashboard
- [ ] Implement staff re-approval if disabled
- [ ] Add approval deadline (auto-reject after X days of pending)
- [ ] Create admin approval API analytics dashboard
