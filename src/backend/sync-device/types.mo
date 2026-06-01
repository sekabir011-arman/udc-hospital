module {

  public type DeviceSyncRecord = {
    deviceId     : Text;
    principalId  : Text;
    lastSyncTime : Int;
    syncCount    : Nat;
    lastDataType : Text;
  };

  public type DeltaQuery = {
    #patients;
    #visits;
    #prescriptions;
    #observations;
    #beds;
    #appointments;
    #alerts;
  };

};
