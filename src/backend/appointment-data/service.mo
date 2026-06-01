import Map "mo:core/Map";
import Time "mo:core/Time";
import Types "types";

module {

  public type AppointmentState = {
    appointments : Map.Map<Text, Types.Appointment>;
  };

  // ─── Create ────────────────────────────────────────────────────────────────

  /// Adds a new appointment after checking for conflicts.
  /// Conflict = same doctorEmail + date + timeSlot with #confirmed status.
  public func createAppointment(
    state       : AppointmentState,
    id          : Text,
    patientId   : Nat,
    patientName : Text,
    doctorEmail : Text,
    doctorName  : Text,
    chamberName : Text,
    date        : Int,
    timeSlot    : Text,
    notes       : Text,
  ) : { #Ok : Types.Appointment; #Err : Text } {
    // conflict check
    for ((_, appt) in state.appointments.entries()) {
      if (
        appt.doctorEmail == doctorEmail and
        appt.date        == date        and
        appt.timeSlot    == timeSlot    and
        appt.status      == #confirmed
      ) {
        return #Err("Slot already booked for this doctor on this date");
      };
    };
    let now = Time.now();
    let entry : Types.Appointment = {
      id;
      patientId;
      patientName;
      doctorEmail;
      doctorName;
      chamberName;
      date;
      timeSlot;
      status    = #pending;
      notes;
      createdAt = now;
      updatedAt = now;
      isDeleted = false;
    };
    state.appointments.add(id, entry);
    #Ok(entry);
  };

  // ─── Read ──────────────────────────────────────────────────────────────────

  public func getAppointment(
    state : AppointmentState,
    id    : Text,
  ) : ?Types.Appointment {
    state.appointments.get(id);
  };

  public func getAllAppointmentsByDoctor(
    state       : AppointmentState,
    doctorEmail : Text,
  ) : [Types.Appointment] {
    let result = Map.empty<Nat, Types.Appointment>();
    var idx : Nat = 0;
    for ((_, appt) in state.appointments.entries()) {
      if (appt.doctorEmail == doctorEmail and not appt.isDeleted) {
        result.add(idx, appt);
        idx += 1;
      };
    };
    toArray(result);
  };

  public func getAppointmentsByDate(
    state : AppointmentState,
    date  : Int,
  ) : [Types.Appointment] {
    let result = Map.empty<Nat, Types.Appointment>();
    var idx : Nat = 0;
    for ((_, appt) in state.appointments.entries()) {
      if (appt.date == date and not appt.isDeleted) {
        result.add(idx, appt);
        idx += 1;
      };
    };
    toArray(result);
  };

  public func getAvailableSlots(
    state       : AppointmentState,
    doctorEmail : Text,
    date        : Int,
    chamberName : Text,
    slots       : [Text],
  ) : [Text] {
    // collect booked slots for this doctor+date (only confirmed)
    let booked = Map.empty<Text, Bool>();
    for ((_, appt) in state.appointments.entries()) {
      if (
        appt.doctorEmail == doctorEmail and
        appt.date        == date        and
        appt.status      == #confirmed  and
        not appt.isDeleted
      ) {
        booked.add(appt.timeSlot, true);
      };
    };
    // filter slots that are not booked
    let available = Map.empty<Nat, Text>();
    var idx : Nat = 0;
    for (slot in slots.vals()) {
      switch (booked.get(slot)) {
        case null {
          available.add(idx, slot);
          idx += 1;
        };
        case (?_) {};
      };
    };
    toTextArray(available);
  };

  // ─── Update ────────────────────────────────────────────────────────────────

  public func updateAppointmentStatus(
    state  : AppointmentState,
    id     : Text,
    status : Types.AppointmentStatus,
  ) : { #Ok : Types.Appointment; #Err : Text } {
    switch (state.appointments.get(id)) {
      case null { #Err("Appointment not found") };
      case (?appt) {
        let updated = { appt with status; updatedAt = Time.now() };
        state.appointments.add(id, updated);
        #Ok(updated);
      };
    };
  };

  public func cancelAppointmentsByDate(
    state       : AppointmentState,
    doctorEmail : Text,
    date        : Int,
  ) : Nat {
    var count : Nat = 0;
    let now = Time.now();
    for ((id, appt) in state.appointments.entries()) {
      if (appt.doctorEmail == doctorEmail and appt.date == date and not appt.isDeleted) {
        let updated = { appt with status = #cancelled; updatedAt = now };
        state.appointments.add(id, updated);
        count += 1;
      };
    };
    count;
  };

  // ─── Private helpers ───────────────────────────────────────────────────────

  private func toArray(m : Map.Map<Nat, Types.Appointment>) : [Types.Appointment] {
    var arr : [Types.Appointment] = [];
    for ((_, v) in m.entries()) {
      arr := arr.concat([v]);
    };
    arr;
  };

  private func toTextArray(m : Map.Map<Nat, Text>) : [Text] {
    var arr : [Text] = [];
    for ((_, v) in m.entries()) {
      arr := arr.concat([v]);
    };
    arr;
  };

};
