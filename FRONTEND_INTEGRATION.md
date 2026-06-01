# Frontend Integration Guide

## Setup

### 1. Install Dependencies

Ensure you have the required dependencies:
```bash
npm install axios
```

### 2. Environment Variables

Your `.env.local` has been created with:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase public key
- `VITE_BACKEND_API_URL` - Backend API URL (http://localhost:3001 for dev)

## Available Hooks

### useAuth
Handles user authentication

```typescript
import { useAuth } from '@/hooks';

const { user, token, loading, error, login, logout, register } = useAuth();

// Login
await login('user@example.com', 'password');

// Logout
await logout();

// Register
await register('user@example.com', 'password', 'doctor');
```

### usePatients
Manages patient data

```typescript
import { usePatients } from '@/hooks';

const {
  patients,
  currentPatient,
  loading,
  error,
  fetchAll,
  fetchById,
  create,
  update,
  delete: deletePatient,
  syncSince,
} = usePatients();

// Fetch all patients
await fetchAll();

// Fetch single patient
await fetchById('patient-id');

// Create patient
await create({
  fullName: 'John Doe',
  gender: 'male',
  patientType: 'outdoor',
  allergies: [],
  chronicConditions: [],
});

// Update patient
await update('patient-id', { fullName: 'Jane Doe' });

// Delete patient
await deletePatient('patient-id');

// Sync patients since timestamp
await syncSince(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
```

### useVisits
Manages patient visits

```typescript
import { useVisits } from '@/hooks';

const {
  visits,
  loading,
  error,
  fetchAll,
  fetchByPatientId,
  create,
  update,
  delete: deleteVisit,
} = useVisits();

// Create visit
await create({
  patientId: 'patient-id',
  visitDate: new Date().toISOString(),
  chiefComplaint: 'Fever',
  visitType: 'outdoor',
  vitalSigns: {
    temperature: '38.5',
    pulse: '80',
  },
});

// Fetch visits for patient
await fetchByPatientId('patient-id');
```

### usePrescriptions
Manages prescriptions

```typescript
import { usePrescriptions } from '@/hooks';

const {
  prescriptions,
  loading,
  error,
  fetchByPatientId,
  fetchByVisitId,
  create,
  update,
  delete: deletePrescription,
} = usePrescriptions();

// Create prescription
await create({
  patientId: 'patient-id',
  prescriptionDate: new Date().toISOString(),
  medications: [
    {
      name: 'Aspirin',
      dose: '500mg',
      frequency: 'Twice daily',
      duration: '7 days',
      instructions: 'After meals',
    },
  ],
});

// Fetch prescriptions for patient
await fetchByPatientId('patient-id');
```

### AuthProvider & ProtectedRoute
Provides authentication context and route protection

```typescript
import { AuthProvider, ProtectedRoute, useAuthContext } from '@/hooks';

// In your main App component
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

// In any component
function MyComponent() {
  const { user, isAuthenticated, logout } = useAuthContext();

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  return (
    <div>
      Welcome, {user?.email}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Example Components

### Login Component
```typescript
import { useState } from 'react';
import { useAuthContext } from '@/hooks';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Patients List Component
```typescript
import { useEffect } from 'react';
import { usePatients } from '@/hooks';

function PatientsList() {
  const { patients, loading, error, fetchAll } = usePatients();

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div>
      <h2>Patients</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id}>
              <td>{patient.fullName}</td>
              <td>{patient.email}</td>
              <td>{patient.phone}</td>
              <td>{patient.patientType}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## API Service

The `api.ts` file provides direct axios instance for custom requests:

```typescript
import api from '@/services/api';

// Custom GET request
const response = await api.get('/patients');

// Custom POST request
const response = await api.post('/patients', patientData);

// Token is automatically included in headers
```

## Error Handling

All hooks provide consistent error handling:

```typescript
const { error, loading } = usePatients();

try {
  await create(patientData);
} catch (err) {
  console.error('Failed to create patient:', error);
}
```

## Testing the Integration

1. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend:**
   ```bash
   cd src/frontend
   npm run dev
   ```

3. **Test API calls:**
   - Navigate to http://localhost:5173
   - Open browser console to see requests
   - Test login/register
   - Create/edit/delete patients

## Next Steps

1. Update existing pages to use these hooks
2. Remove old Motoko canister calls
3. Test all functionality
4. Deploy to production
