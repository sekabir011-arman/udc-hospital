import Time "mo:core/Time";
import Int  "mo:core/Int";

module {

  /// Returns the current IC time as a nanosecond integer.
  public func timestampNow() : Int {
    Time.now()
  };

  /// Converts a nanosecond timestamp to seconds (truncated).
  public func toSeconds(ts : Int) : Int {
    ts / 1_000_000_000
  };

  /// Returns a simple ISO-8601 date string approximation "YYYY-MM-DD" from
  /// a nanosecond Unix timestamp.  The IC starts at the Unix epoch so simple
  /// integer arithmetic is sufficient for display purposes.
  public func formatTimestamp(ts : Int) : Text {
    let secs  = toSeconds(ts);
    // Days since Unix epoch
    let days  = secs / 86_400;
    // Shift epoch to 2001-01-01 (day 11323 since 1970-01-01) for simple calc
    let d400  = (days + 146_097 * 5 - 11_323) % 146_097;
    let n100  = d400 / 36_524;
    let d100  = d400 - n100 * 36_524;
    let n4    = d100 / 1_461;
    let d4    = d100 - n4 * 1_461;
    let n1    = d4   / 365;
    let doy   = d4   - n1 * 365;
    let year  = 400 * ((days + 146_097 * 5 - 11_323) / 146_097)
                + 100 * n100 + 4 * n4 + n1 + 1970;
    // Rough month/day from day-of-year (non-leap for display)
    let monthDays : [Nat] = [31,28,31,30,31,30,31,31,30,31,30,31];
    var remaining = Int.abs(doy);
    var month     = 1;
    var i         = 0;
    while (i < 12) {
      let md = monthDays[i];
      if (remaining < md) {
        i := 13; // exit
      } else {
        remaining -= md;
        month     += 1;
        i         += 1;
      };
    };
    let day = remaining + 1;
    let pad = func(n : Int) : Text {
      let s = Int.toText(n);
      if (s.size() < 2) { "0" # s } else { s }
    };
    Int.toText(year) # "-" # pad(month) # "-" # pad(day)
  };

};
