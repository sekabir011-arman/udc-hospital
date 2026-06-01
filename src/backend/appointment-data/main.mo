// moc >= 1.8.2
import Map    "mo:core/Map";
import Types  "types";
import Service "service";

actor AppointmentData {

  // ─── Persistent state ─────────────────────────────────────────────────────

  let appointments : Map.Map<Text, Types.Appointment> = Map.empty<Text, Types.Appointment>();

  let state : Service.AppointmentState = { appointments };

  // ─── Counter for simple id generation ─────────────────────────────────────

  let nextId = { var value : Nat = 0 };

  private func genId() : Text {
    nextId.value += 1;
    "APPT-" # debug_show(nextId.value);
  };

  // ─── Public API ────────────────────────────────────────────────────────────

  public func createAppointment(
    patientId   : Nat,
    patientName : Text,
    doctorEmail : Text,
    doctorName  : Text,
    chamberName : Text,
    date        : Int,
    timeSlot    : Text,
    notes       : Text,
  ) : async { #Ok : Types.Appointment; #Err : Text } {
    Service.createAppointment(
      state,
      genId(),
      patientId,
      patientName,
      doctorEmail,
      doctorName,
      chamberName,
      date,
      timeSlot,
      notes,
    );
  };

  public query func getAppointment(id : Text) : async ?Types.Appointment {
    Service.getAppointment(state, id);
  };

  public func updateAppointmentStatus(
    id     : Text,
    status : Types.AppointmentStatus,
  ) : async { #Ok : Types.Appointment; #Err : Text } {
    Service.updateAppointmentStatus(state, id, status);
  };

  public func cancelAppointmentsByDate(
    doctorEmail : Text,
    date        : Int,
  ) : async Nat {
    Service.cancelAppointmentsByDate(state, doctorEmail, date);
  };

  public query func getAllAppointmentsByDoctor(
    doctorEmail : Text,
  ) : async [Types.Appointment] {
    Service.getAllAppointmentsByDoctor(state, doctorEmail);
  };

  public query func getAppointmentsByDate(
    date : Int,
  ) : async [Types.Appointment] {
    Service.getAppointmentsByDate(state, date);
  };

  public query func getAvailableSlots(
    doctorEmail : Text,
    date        : Int,
    chamberName : Text,
    slots       : [Text],
  ) : async [Text] {
    Service.getAvailableSlots(state, doctorEmail, date, chamberName, slots);
  };

};
