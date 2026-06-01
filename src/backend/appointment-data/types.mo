module {

  public type AppointmentStatus = {
    #pending;
    #confirmed;
    #cancelled;
    #completed;
    #noShow;
  };

  public type Appointment = {
    id          : Text;
    patientId   : Nat;
    patientName : Text;
    doctorEmail : Text;
    doctorName  : Text;
    chamberName : Text;
    date        : Int;
    timeSlot    : Text;
    status      : AppointmentStatus;
    notes       : Text;
    createdAt   : Int;
    updatedAt   : Int;
    isDeleted   : Bool;
  };

};
