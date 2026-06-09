declare module "@icp-sdk/core/agent" {
  export type ActorMethod<Args extends unknown[], R> = (...args: Args) => Promise<R>;
  export type HttpAgentOptions = Record<string, unknown>;
  export type ActorConfig = Record<string, unknown>;
  export type Agent = Record<string, unknown>;
  export type ActorSubclass<T> = T;
}

declare module "@icp-sdk/core/candid" {
  export type IDL = unknown;
}

declare module "@icp-sdk/core/principal" {
  export type Principal = string;
}
