export interface User {
  id: string;
  email: string;
  name: string;
  role:
    | 'admin'
    | 'professor'
    | 'associate_professor'
    | 'assistant_professor'
    | 'consultant_doctor'
    | 'doctor'
    | 'registrar'
    | 'assistant_registrar'
    | 'medical_officer'
    | 'intern_doctor'
    | 'nurse'
    | 'reception'
    | 'staff'
    | 'patient';
  department?: string;
  unit?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientAssignment {
  id: string;
  patientId: string;
  nurseId: string;
  assignmentRole: 'nurse' | 'intern_doctor' | 'medical_officer' | 'assistant_registrar' | 'registrar' | 'consultant';
  department?: string;
  unit?: string;
  ward: string;
  isPrimary: boolean;
  isConsulting?: boolean;
  active: boolean;
  assignedBy?: string;
  assignedByRole?: string;
  assignedAt: Date;
  startAt: Date;
  endAt?: Date;
  transferReason?: string;
  handoverClinicalSummary?: string;
  referralReason?: string;
  referralRequestedBy?: string;
  referralAt?: Date;
  isEmergency?: boolean;
  notificationSentAt?: Date;
  referralStatus?: 'new' | 'pending_review' | 'accepted' | 'assessment' | 'recommendation_issued' | 'closed';
  responseRequestedAt?: Date;
  respondedAt?: Date;
  assessmentAt?: Date;
  recommendationIssuedAt?: Date;
  closedAt?: Date;
  handoverFrom?: string;
  handoverTo?: string;
  handoverNotes?: string;
  handoverAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'M' | 'F' | 'O';
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bloodGroup?: string;
  allergies?: string[];
  pastSurgicalHistory?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vitals {
  id: string;
  patientId: string;
  bloodPressure: string; // "120/80"
  pulse: number;
  temperature: number;
  respiratoryRate: number;
  spO2: number;
  bloodGlucose?: number;
  gcs?: number;
  recordedAt: Date;
  recordedBy: string; // User ID
  status: 'drafted' | 'pending_review' | 'verified' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: Date;
  duration: number; // in minutes
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Prescription {
  id: string;
  patientId: string;
  medicineId: string;
  dosage: string;
  frequency: string;
  duration: number; // in days
  instructions?: string;
  startDate: Date;
  endDate: Date;
  prescribedBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export interface Investigation {
  id: string;
  patientId: string;
  testName: string;
  result?: string;
  normalRange?: string;
  unit?: string;
  status: 'pending' | 'completed' | 'reviewed';
  orderedBy: string; // User ID
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
}
