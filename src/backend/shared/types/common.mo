import Time "mo:core/Time";

module {

  // ─── Primitive ID aliases ─────────────────────────────────────────────────

  public type Timestamp    = Int;   // nanoseconds, from Time.now()
  public type UserId       = Nat;
  public type PatientId    = Nat;
  public type BedId        = Nat;
  public type AppointmentId = Text; // UUID / sequential text key
  public type QueueId      = Text;
  public type AlertId      = Nat;
  public type DeviceId     = Text;

  // ─── Generic Result ───────────────────────────────────────────────────────

  /// A structured error carried inside a Result variant.
  public type Error = {
    code    : Text;
    message : Text;
  };

  /// Shared-safe generic result — Ok carries the success value, Err carries
  /// an Error record.  Use the helpers in shared/utils/result.mo to construct.
  public type Result<T> = {
    #Ok  : T;
    #Err : Error;
  };

};
