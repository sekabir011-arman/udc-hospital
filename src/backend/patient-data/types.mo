import HospitalTypes "../shared/types/hospital";

module {

  public type StaffRole = HospitalTypes.StaffRole;

  // ─── Patient ──────────────────────────────────────────────────────────────

  public type Patient = {
    id               : Nat;
    firstName        : Text;
    lastName         : Text;
    dateOfBirth      : Text;
    gender           : Text;
    phone            : Text;
    email            : Text;
    address          : Text;
    bloodGroup       : Text;
    weight           : Float;
    height           : Float;
    allergies        : [Text];
    chronicConditions: [Text];
    surgicalHistory  : [Text];
    consultantEmail  : Text;
    registrationNumber : Text;
    createdAt        : Int;
    updatedAt        : Int;
    isDeleted        : Bool;
  };

  // ─── UserProfile ──────────────────────────────────────────────────────────

  public type UserProfile = {
    principal    : Principal;
    email        : Text;
    name         : Text;
    role         : StaffRole;
    phone        : Text;
    profilePhoto : Text;
    createdAt    : Int;
  };

  // ─── Visit ────────────────────────────────────────────────────────────────

  public type Visit = {
    id             : Nat;
    patientId      : Nat;
    visitType      : Text;
    date           : Int;
    chiefComplaint : Text;
    diagnosis      : Text;
    notes          : Text;
    doctorEmail    : Text;
    isAdmitted     : Bool;
    createdAt      : Int;
    updatedAt      : Int;
  };

  // ─── Prescription ─────────────────────────────────────────────────────────

  public type Prescription = {
    id           : Nat;
    patientId    : Nat;
    visitId      : Nat;
    medications  : [Text];
    diagnoses    : [Text];
    advice       : Text;
    followUpDate : Text;
    doctorEmail  : Text;
    createdAt    : Int;
    updatedAt    : Int;
  };

  // ─── FrontPageContent ─────────────────────────────────────────────────────

  public type FrontPageContent = {
    heroTitle          : Text;
    heroSubtitle       : Text;
    tagline            : Text;
    aboutDescription   : Text;
    testimonials       : [Text];
    galleryUrls        : [Text];
    chamberAddresses   : [Text];
    emergencyPhone     : Text;
    doctorProfiles     : [Text];
    announcementBanner : Text;
    updatedAt          : Int;
  };

};
