module {

  public type AlertType = {
    #sepsis;
    #aki;
    #hypotension;
    #hypoxia;
    #news2High;
    #hypoglycemia;
    #hypertensiveUrgency;
  };

  public type AlertStatus = {
    #active;
    #acknowledged;
    #resolved;
  };

  public type AlertSeverity = {
    #critical;
    #warning;
    #info;
  };

  public type ClinicalAlert = {
    id              : Nat;
    patientId       : Nat;
    alertType       : AlertType;
    severity        : AlertSeverity;
    status          : AlertStatus;
    message         : Text;
    triggeredBy     : Text;
    triggeredAt     : Int;
    acknowledgedBy  : Text;
    acknowledgedAt  : Int;
    resolvedBy      : Text;
    resolvedAt      : Int;
    isDeleted       : Bool;
  };

};
