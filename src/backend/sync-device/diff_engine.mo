import Types "types";

module {

  /// Stub — sync-device canister does not own domain data.
  /// Actual delta queries are performed by the frontend calling each domain
  /// canister directly with a `since` timestamp filter.
  public func bulkQuerySince(
    dataType : Types.DeltaQuery,
    since    : Int,
  ) : [Text] {
    ignore (dataType, since);
    [];
  };

};
