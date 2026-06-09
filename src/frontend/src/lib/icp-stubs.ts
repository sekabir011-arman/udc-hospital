export type Principal = string;
export type HttpAgentOptions = Record<string, unknown>;
export type ActorConfig = Record<string, unknown>;
export type Agent = Record<string, unknown>;
export type ActorSubclass<T> = T;

export const HttpAgent = {
  createSync: (_options?: HttpAgentOptions): Agent => ({}) as Agent,
};

export const Actor = {
  createActor: <T>(
    _idlFactory: unknown,
    _options: { agent: Agent; canisterId: string } & ActorConfig,
  ): ActorSubclass<T> => ({} as ActorSubclass<T>),
};

export const IDL = {
  Null: null,
  Bool: null,
  Text: null,
  Nat: null,
  Nat64: null,
  Int: null,
  Principal: null,
  Opt: (value: unknown) => ({ __kind__: "Opt", value } as const),
  Vec: (value: unknown) => ({ __kind__: "Vec", value } as const),
  Record: (value: Record<string, unknown>) => ({ __kind__: "Record", value } as const),
  Variant: (value: Record<string, unknown>) => ({ __kind__: "Variant", value } as const),
  Tuple: (...values: unknown[]) => ({ __kind__: "Tuple", values } as const),
};
