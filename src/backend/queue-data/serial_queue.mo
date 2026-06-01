import Map  "mo:core/Map";
import Time "mo:core/Time";
import Int  "mo:core/Int";
import Types "types";

module {

  public type QueueState = {
    entries : Map.Map<Text, Types.SerialQueueEntry>;
    // counter per (date, doctorEmail) key → next serial number
    counters : Map.Map<Text, Nat>;
  };

  // ─── Build composite key ───────────────────────────────────────────────────

  private func compositeKey(date : Int, doctorEmail : Text) : Text {
    Int.toText(date) # "_" # doctorEmail;
  };

  // ─── Add to queue ─────────────────────────────────────────────────────────

  public func addToQueue(
    state       : QueueState,
    patientId   : Nat,
    patientName : Text,
    doctorEmail : Text,
    date        : Int,
  ) : Types.SerialQueueEntry {
    let key   = compositeKey(date, doctorEmail);
    let next  = switch (state.counters.get(key)) {
      case null    1;
      case (?n)    n + 1;
    };
    state.counters.add(key, next);
    let id    = key # "-" # debug_show(next);
    let entry : Types.SerialQueueEntry = {
      id;
      patientId;
      patientName;
      doctorEmail;
      date;
      serialNumber = next;
      status       = #waiting;
      createdAt    = Time.now();
    };
    state.entries.add(id, entry);
    entry;
  };

  // ─── Queries ───────────────────────────────────────────────────────────────

  public func getSerialQueue(
    state       : QueueState,
    date        : Int,
    doctorEmail : Text,
  ) : [Types.SerialQueueEntry] {
    getQueueByDateAndDoctor(state, date, doctorEmail);
  };

  public func getQueueByDateAndDoctor(
    state       : QueueState,
    date        : Int,
    doctorEmail : Text,
  ) : [Types.SerialQueueEntry] {
    // collect matching entries
    var list : [Types.SerialQueueEntry] = [];
    for ((_, entry) in state.entries.entries()) {
      if (entry.date == date and entry.doctorEmail == doctorEmail) {
        list := list.concat([entry]);
      };
    };
    // sort by serialNumber ascending
    sortBySerial(list);
  };

  // ─── Update ────────────────────────────────────────────────────────────────

  public func updateSerialQueueStatus(
    state  : QueueState,
    id     : Text,
    status : Types.QueueStatus,
  ) : { #Ok : Types.SerialQueueEntry; #Err : Text } {
    switch (state.entries.get(id)) {
      case null { #Err("Queue entry not found") };
      case (?entry) {
        let updated = { entry with status };
        state.entries.add(id, updated);
        #Ok(updated);
      };
    };
  };

  // ─── Sort helper ───────────────────────────────────────────────────────────

  private func sortBySerial(
    arr : [Types.SerialQueueEntry],
  ) : [Types.SerialQueueEntry] {
    // insertion sort — queue sizes are small (per doctor per day)
    var sorted = arr;
    var i = 1;
    while (i < sorted.size()) {
      let current = sorted[i];
      var j = i;
      while (j > 0 and sorted[j - 1].serialNumber > current.serialNumber) {
        let prev = sorted[j - 1];
        sorted := replaceAt(sorted, j, prev);
        j -= 1;
      };
      sorted := replaceAt(sorted, j, current);
      i += 1;
    };
    sorted;
  };

  private func replaceAt(
    arr  : [Types.SerialQueueEntry],
    idx  : Nat,
    item : Types.SerialQueueEntry,
  ) : [Types.SerialQueueEntry] {
    var result : [Types.SerialQueueEntry] = [];
    var i = 0;
    while (i < arr.size()) {
      if (i == idx) {
        result := result.concat([item]);
      } else {
        result := result.concat([arr[i]]);
      };
      i += 1;
    };
    result;
  };

};
