module {

  public type QueueStatus = {
    #waiting;
    #called;
    #serving;
    #done;
    #skipped;
  };

  public type SerialQueueEntry = {
    id           : Text;
    patientId    : Nat;
    patientName  : Text;
    doctorEmail  : Text;
    date         : Int;
    serialNumber : Nat;
    status       : QueueStatus;
    createdAt    : Int;
  };

};
