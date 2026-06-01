import CommonTypes "../types/common";
import Debug       "mo:core/Debug";

module {

  /// Wraps a success value in the shared Result type.
  public func ok<T>(val : T) : CommonTypes.Result<T> {
    #Ok val
  };

  /// Wraps an error in the shared Result type.
  public func err<T>(code : Text, msg : Text) : CommonTypes.Result<T> {
    #Err { code = code; message = msg }
  };

  /// Returns true when the result is Ok.
  public func isOk<T>(r : CommonTypes.Result<T>) : Bool {
    switch r { case (#Ok _) true; case (#Err _) false }
  };

  /// Returns true when the result is an Err.
  public func isErr<T>(r : CommonTypes.Result<T>) : Bool {
    not isOk<T>(r)
  };

  /// Unwraps an Ok value or traps with the error message.
  public func unwrap<T>(r : CommonTypes.Result<T>) : T {
    switch r {
      case (#Ok v)  v;
      case (#Err e) Debug.trap(e.code # ": " # e.message);
    }
  };

};
