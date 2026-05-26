import type { Principal } from '@icp-sdk/core/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export interface Patient {
  'id' : bigint,
  'owner' : Principal,
  'createdAt' : Time,
  'fullName' : string,
}
export type Time = bigint;
export interface _SERVICE {
  'createPatient' : ActorMethod<[string], Patient>,
  'getPatient' : ActorMethod<[bigint], [] | [Patient]>,
  'health' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
