// moc >= 1.8.2
import Map    "mo:core/Map";
import Types  "types";
import Queue  "serial_queue";

actor QueueData {

  // ─── Persistent state ─────────────────────────────────────────────────────

  let entries  : Map.Map<Text, Types.SerialQueueEntry> = Map.empty<Text, Types.SerialQueueEntry>();
  let counters : Map.Map<Text, Nat>                    = Map.empty<Text, Nat>();

  let state : Queue.QueueState = { entries; counters };

  // ─── Public API ────────────────────────────────────────────────────────────

  public func addToQueue(
    patientId   : Nat,
    patientName : Text,
    doctorEmail : Text,
    date        : Int,
  ) : async Types.SerialQueueEntry {
    Queue.addToQueue(state, patientId, patientName, doctorEmail, date);
  };

  public query func getSerialQueue(
    date        : Int,
    doctorEmail : Text,
  ) : async [Types.SerialQueueEntry] {
    Queue.getSerialQueue(state, date, doctorEmail);
  };

  public query func getQueueByDateAndDoctor(
    date        : Int,
    doctorEmail : Text,
  ) : async [Types.SerialQueueEntry] {
    Queue.getQueueByDateAndDoctor(state, date, doctorEmail);
  };

  public func updateSerialQueueStatus(
    id     : Text,
    status : Types.QueueStatus,
  ) : async { #Ok : Types.SerialQueueEntry; #Err : Text } {
    Queue.updateSerialQueueStatus(state, id, status);
  };

};
