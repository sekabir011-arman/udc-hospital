import Text "mo:core/Text";

module {

  /// Returns true when the text contains an '@' character.
  public func validateEmail(email : Text) : Bool {
    email.size() > 3 and
    email.contains('@') and
    email.contains('.')
  };

  /// Returns true when the text has at least 10 characters (covers BD / intl phone numbers).
  public func validatePhone(phone : Text) : Bool {
    phone.size() >= 10
  };

  /// Returns true when the text is non-empty.
  public func validatePatientId(id : Text) : Bool {
    id.size() > 0
  };

  /// Returns true when a value is within an inclusive range.
  public func inRange(value : Float, lo : Float, hi : Float) : Bool {
    value >= lo and value <= hi
  };

};
