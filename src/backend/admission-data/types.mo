import HospitalTypes "../shared/types/hospital";
import CommonTypes "../shared/types/common";
import Principal "mo:core/Principal";

module {

  // Re-export shared types for convenience
  public type BedRecord      = HospitalTypes.BedRecord;
  public type BedStatus      = HospitalTypes.BedStatus;
  public type BedType        = HospitalTypes.BedType;
  public type Admission      = HospitalTypes.Admission;
  public type AdmissionStatus = HospitalTypes.AdmissionStatus;

  // Local transfer audit entry — richer than the shared BedTransferEntry
  public type BedTransferEntry = {
    bedId         : CommonTypes.BedId;   // Nat — never mix with Int/Float
    fromWard      : Text;
    toWard        : Text;
    transferredAt : CommonTypes.Timestamp;
    transferredBy : Principal;
    reason        : Text;
  };

};
