export const idlFactory = ({ IDL }) => {
  const Time = IDL.Int;
  const Patient = IDL.Record({
    'id' : IDL.Nat,
    'owner' : IDL.Principal,
    'createdAt' : Time,
    'fullName' : IDL.Text,
  });
  return IDL.Service({
    'createPatient' : IDL.Func([IDL.Text], [Patient], []),
    'getPatient' : IDL.Func([IDL.Nat], [IDL.Opt(Patient)], ['query']),
    'health' : IDL.Func([], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
