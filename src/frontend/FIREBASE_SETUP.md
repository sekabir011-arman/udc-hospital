# Firebase Setup Guide

## Configuration Complete ✅

Your Firebase integration for Dr. Arman Kabir's Care is ready!

### **Project Details**
- **Project ID:** drarmankabir
- **Auth Domain:** drarmankabir.firebaseapp.com
- **Storage Bucket:** drarmankabir.firebasestorage.app
- **Frontend:** `src/frontend/`

---

## 🔒 Security Rules Setup

### **1. Firestore Security Rules**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select `drarmankabir` project
3. Navigate to **Firestore Database** > **Rules**
4. Copy content from `firestore.rules` file
5. Paste and publish

**Features:**
- ✅ Authenticated users can read/write patient data
- ✅ Users can only modify their own profiles
- ✅ Admin-only audit log access
- ✅ Sub-collections for medical records, prescriptions, lab results

### **2. Firebase Storage Rules**

1. Navigate to **Storage** > **Rules**
2. Copy content from `storage.rules` file
3. Paste and publish

**Features:**
- ✅ Secure patient file uploads
- ✅ User avatars (write-only by owner)
- ✅ Prescription & report storage
- ✅ Default deny for unknown paths

---

## 📊 Firestore Data Structure

## 🚀 Usage Examples

### Authentication

```typescript
import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

const { user, loading, error, signIn, signUp, signOut } = useFirebaseAuth();

// Sign up
await signUp('doctor@example.com', 'password123');

// Sign in
await signIn('patient@example.com', 'password123');

// Sign out
await signOut();
```

---

### Query Patients

```typescript
import { useFirestoreQuery } from '@/hooks/useFirestore';

const { data: patients, isLoading } = useFirestoreQuery('patients');
```

---

### Add Patient

```typescript
import { useAddFirestoreDocument } from '@/hooks/useFirestore';

const mutation = useAddFirestoreDocument('patients');

await mutation.mutateAsync({
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  dateOfBirth: new Date('1990-01-01'),
  bloodGroup: 'O+',
  allergies: ['Penicillin'],
  createdAt: new Date(),
});
```

---

### Get Patient by Field

```typescript
import { useFirestoreQueryByField } from '@/hooks/useFirestore';

const { data: patient } = useFirestoreQueryByField(
  'patients',
  'email',
  'john@example.com'
);
```

---

### Update Patient

```typescript
import { useUpdateFirestoreDocument } from '@/hooks/useFirestore';

const mutation = useUpdateFirestoreDocument('patients');

await mutation.mutateAsync({
  docId: 'patient-123',
  data: {
    bloodGroup: 'AB+',
    updatedAt: new Date(),
  },
});
```

---

### Delete Patient

```typescript
import { useDeleteFirestoreDocument } from '@/hooks/useFirestore';

const mutation = useDeleteFirestoreDocument('patients');

await mutation.mutateAsync('patient-123');
```

---

### Upload Medical Record

```typescript
import { firebaseStorageService } from '@/lib/firebaseStorage';

const file = new File([...], 'report.pdf', {
  type: 'application/pdf',
});

const url = await firebaseStorageService.uploadFile(
  `patients/${patientId}/reports/report.pdf`,
  file
);
```
