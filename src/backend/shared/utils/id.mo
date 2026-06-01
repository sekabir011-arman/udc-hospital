module {

  /// A simple mutable counter used to generate sequential Nat IDs.
  /// Place one instance per entity in the caller's actor state:
  ///
  ///   let patientCounter = IdGen.Counter();
  ///   ...
  ///   let newId = patientCounter.next();
  ///
  public class Counter() {
    var _n : Nat = 0;

    /// Returns the next unique ID (starts at 1).
    public func next() : Nat {
      _n += 1;
      _n
    };

    /// Peeks at the current value without advancing it.
    public func current() : Nat { _n };

    /// Resets to a given value — useful for migrations / upgrades.
    public func reset(to : Nat) { _n := to };
  };

  /// Convenience helper: creates a Counter already seeded to `seed`.
  public func seeded(seed : Nat) : Counter {
    let c = Counter();
    c.reset(seed);
    c
  };

};
