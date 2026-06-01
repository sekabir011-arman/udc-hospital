module {

  // 13 staff roles
  public type StaffRole = {
    #patient;
    #intern;
    #nurse;
    #receptionStaff;
    #medicalOfficer;
    #assistantRegistrar;
    #registrar;
    #consultant;
    #assistantProfessor;
    #associateProfessor;
    #professor;
    #admin;
    #guest;
  };

  // 3-tier access tier
  public type AccessTier = {
    #admin;
    #user;
    #guest;
  };

};
