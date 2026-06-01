// Clinical-data domain — re-export shared types and add local aliases.
import ClinicalTypes "../shared/types/clinical";
import AlertTypes   "../shared/types/alert";
import CommonTypes  "../shared/types/common";
import Principal    "mo:core/Principal";
import Time         "mo:core/Time";

module {

  // ─── Re-exports from shared/types/clinical.mo ─────────────────────────────

  public type StaffRole                   = ClinicalTypes.StaffRole;
  public type VersionedRecord             = ClinicalTypes.VersionedRecord;
  public type EncounterType               = ClinicalTypes.EncounterType;
  public type EncounterStatus             = ClinicalTypes.EncounterStatus;
  public type Encounter                   = ClinicalTypes.Encounter;
  public type VitalVerificationStatus     = ClinicalTypes.VitalVerificationStatus;
  public type ObservationType             = ClinicalTypes.ObservationType;
  public type ObservationStatus           = ClinicalTypes.ObservationStatus;
  public type Observation                 = ClinicalTypes.Observation;
  public type OrderType                   = ClinicalTypes.OrderType;
  public type OrderStatus                 = ClinicalTypes.OrderStatus;
  public type Order                       = ClinicalTypes.Order;
  public type NoteType                    = ClinicalTypes.NoteType;
  public type ClinicalNote                = ClinicalTypes.ClinicalNote;
  public type DailyProgressType           = ClinicalTypes.DailyProgressType;
  public type DailyNoteState              = ClinicalTypes.DailyNoteState;
  public type VitalsSummary               = ClinicalTypes.VitalsSummary;
  public type DailyProgressNoteUpdate     = ClinicalTypes.DailyProgressNoteUpdate;
  public type DailyProgressNote           = ClinicalTypes.DailyProgressNote;
  public type HandoverShift               = ClinicalTypes.HandoverShift;
  public type HandoverStatus              = ClinicalTypes.HandoverStatus;
  public type HandoverEntry               = ClinicalTypes.HandoverEntry;
  public type Medication                  = ClinicalTypes.Medication;
  public type Prescription                = ClinicalTypes.Prescription;
  public type MedicationAdministrationStatus = ClinicalTypes.MedicationAdministrationStatus;
  public type MedicationAdministration    = ClinicalTypes.MedicationAdministration;
  public type AuditEntry                  = ClinicalTypes.AuditEntry;
  public type DiagnosisTemplate           = ClinicalTypes.DiagnosisTemplate;

  // ─── Re-exports from shared/types/alert.mo ────────────────────────────────

  public type AlertType      = AlertTypes.AlertType;
  public type AlertStatus    = AlertTypes.AlertStatus;
  public type AlertSeverity  = AlertTypes.AlertSeverity;
  public type ClinicalAlert  = AlertTypes.ClinicalAlert;

  // ─── Re-exports from shared/types/common.mo ───────────────────────────────

  public type Timestamp   = CommonTypes.Timestamp;
  public type PatientId   = CommonTypes.PatientId;
  public type AlertId     = CommonTypes.AlertId;

  // ─── Local-only types ─────────────────────────────────────────────────────

  /// Ward round status returned by getWardRoundStatus — one entry per admitted patient.
  public type WardRoundPatientStatus = {
    patientId          : Text;
    patientName        : Text;
    bedNumber          : Text;
    ward               : Text;
    admissionDay       : Nat;
    todayNoteState     : ?Text;
    lastVitals         : ?VitalsSummary;
    activeAlerts       : [Text];
    assignedConsultant : ?Text;
  };

  /// Lightweight MAR query parameter.
  public type MARShift = { #morning; #afternoon; #night };

  /// Summary struct for bulk-observation upsert result.
  public type UpsertResult = { inserted : Nat; updated : Nat };

};
