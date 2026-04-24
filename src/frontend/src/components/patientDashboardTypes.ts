/**
 * Shared types and localStorage helpers for the patient dashboard.
 * Extracted to keep PatientDashboard.tsx and pages/PatientDashboard.tsx DRY.
 */

import type {
  AllergyOverrideRecord,
  FamilyHistoryRisk,
  VaccinationRecord,
} from "../types";

const PATIENT_SUBMISSIONS_KEY = "medicare_patient_submissions";
const VACCINATION_KEY_PREFIX = "vaccination_";
const FAMILY_HISTORY_RISK_KEY_PREFIX = "family_history_risk_";
const ALLERGY_OVERRIDES_KEY_PREFIX = "allergy_overrides_";

export interface PatientSubmission {
  id: string;
  patientId: string;
  type: "complaint" | "vitals" | "investigation";
  data: Record<string, string>;
  timestamp: string;
  status: "pending" | "approved" | "rejected";
}

export interface ComplaintEntry {
  id: string;
  patientId: string;
  text: string;
  timestamp: string;
  status: "pending" | "seen";
  doctorNote?: string;
}

export interface AdviceEntry {
  id: string;
  patientId: string;
  text: string;
  date: string;
  addedBy: string;
  source: string;
}

export interface DrugReminder {
  id: string;
  patientId: string;
  drugName: string;
  times: string[];
  enabled: boolean;
  createdAt: string;
}

// ── Daily Progress (SOAP) ─────────────────────────────────────────────────────
export interface SoapEntry {
  id: string;
  patientId: string;
  entryType: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  authorName: string;
  authorRole: string;
  timestamp: string;
  editedAt?: string;
}

export interface ProblemItem {
  id: string;
  name: string;
  status: "active" | "resolved";
  source: "prescription" | "manual";
}

const COMPLAINTS_KEY_PREFIX = "medicare_complaints_";
const ADVICE_KEY_PREFIX = "medicare_advice_entries_";
const DAILY_PROGRESS_KEY_PREFIX = "daily_progress_";
const PROBLEM_LIST_KEY_PREFIX = "problem_list_";

export function loadComplaints(patientId: string): ComplaintEntry[] {
  try {
    const raw = localStorage.getItem(COMPLAINTS_KEY_PREFIX + patientId);
    if (raw) return JSON.parse(raw) as ComplaintEntry[];
  } catch {}
  return [];
}

export function saveComplaints(
  patientId: string,
  complaints: ComplaintEntry[],
): void {
  localStorage.setItem(
    COMPLAINTS_KEY_PREFIX + patientId,
    JSON.stringify(complaints),
  );
}

export function loadAdviceEntries(patientId: string): AdviceEntry[] {
  try {
    const raw = localStorage.getItem(ADVICE_KEY_PREFIX + patientId);
    if (raw) return JSON.parse(raw) as AdviceEntry[];
  } catch {}
  return [];
}

export function saveAdviceEntries(
  patientId: string,
  entries: AdviceEntry[],
): void {
  localStorage.setItem(ADVICE_KEY_PREFIX + patientId, JSON.stringify(entries));
}

export function loadSubmissions(): PatientSubmission[] {
  try {
    const raw = localStorage.getItem(PATIENT_SUBMISSIONS_KEY);
    if (raw) return JSON.parse(raw) as PatientSubmission[];
  } catch {}
  return [];
}

export function saveSubmissions(subs: PatientSubmission[]): void {
  localStorage.setItem(PATIENT_SUBMISSIONS_KEY, JSON.stringify(subs));
}

export function loadDailyProgress(
  doctorEmail: string,
  patientId: string,
): SoapEntry[] {
  try {
    const key = `${DAILY_PROGRESS_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as SoapEntry[];
  } catch {}
  return [];
}

export function saveDailyProgress(
  doctorEmail: string,
  patientId: string,
  entries: SoapEntry[],
): void {
  const key = `${DAILY_PROGRESS_KEY_PREFIX}${doctorEmail}_${patientId}`;
  localStorage.setItem(key, JSON.stringify(entries));
}

export function loadProblemList(
  doctorEmail: string,
  patientId: string,
): ProblemItem[] {
  try {
    const key = `${PROBLEM_LIST_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as ProblemItem[];
  } catch {}
  return [];
}

export function saveProblemList(
  doctorEmail: string,
  patientId: string,
  items: ProblemItem[],
): void {
  const key = `${PROBLEM_LIST_KEY_PREFIX}${doctorEmail}_${patientId}`;
  localStorage.setItem(key, JSON.stringify(items));
}

// ── Vaccination Records ───────────────────────────────────────────────────────

export function loadVaccinationRecords(
  doctorEmail: string,
  patientId: string,
): VaccinationRecord[] {
  try {
    const key = `${VACCINATION_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as VaccinationRecord[];
  } catch {}
  return [];
}

export function saveVaccinationRecords(
  doctorEmail: string,
  patientId: string,
  records: VaccinationRecord[],
): void {
  const key = `${VACCINATION_KEY_PREFIX}${doctorEmail}_${patientId}`;
  localStorage.setItem(key, JSON.stringify(records));
}

// ── Family History Risk ───────────────────────────────────────────────────────

export function loadFamilyHistoryRisk(
  doctorEmail: string,
  patientId: string,
): FamilyHistoryRisk | null {
  try {
    const key = `${FAMILY_HISTORY_RISK_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as FamilyHistoryRisk;
  } catch {}
  return null;
}

export function saveFamilyHistoryRisk(
  doctorEmail: string,
  patientId: string,
  risk: FamilyHistoryRisk,
): void {
  const key = `${FAMILY_HISTORY_RISK_KEY_PREFIX}${doctorEmail}_${patientId}`;
  localStorage.setItem(key, JSON.stringify(risk));
}

// ── Allergy Override Records ──────────────────────────────────────────────────

export function loadAllergyOverrides(
  doctorEmail: string,
  patientId: string,
): AllergyOverrideRecord[] {
  try {
    const key = `${ALLERGY_OVERRIDES_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as AllergyOverrideRecord[];
  } catch {}
  return [];
}

export function saveAllergyOverrides(
  doctorEmail: string,
  patientId: string,
  overrides: AllergyOverrideRecord[],
): void {
  const key = `${ALLERGY_OVERRIDES_KEY_PREFIX}${doctorEmail}_${patientId}`;
  localStorage.setItem(key, JSON.stringify(overrides));
}
