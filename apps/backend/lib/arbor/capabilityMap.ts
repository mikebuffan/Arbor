export type CanonicalOwner={capability:string;owner:string;status:"implemented"|"partial"|"live-gated";notes:string};
export const ONE_ARBOR_CAPABILITY_MAP:readonly CanonicalOwner[]=[
 {capability:"identity/personality",owner:"Arbor Layer",status:"implemented",notes:"One canonical Arbor across surfaces; overlays must not replace identity."},
 {capability:"durable objectives/checkpoints",owner:"ARK",status:"implemented",notes:"Checkpoint is continuation state, not conversational completion."},
 {capability:"host continuation",owner:"Arbor agency host",status:"live-gated",notes:"Source repaired; deployed acceptance still required."},
 {capability:"private conversation host",owner:"Grove",status:"live-gated",notes:"Bounded default-OFF spine remains protected."},
 {capability:"independent inference",owner:"Private LM host",status:"live-gated",notes:"Runtime/model activation requires owner approval."},
 {capability:"editorial intelligence",owner:"Annabelle",status:"implemented",notes:"Diagnostics advisory; durable provenance required."},
 {capability:"felt-state hypotheses",owner:"Felt-Life Atlas",status:"partial",notes:"Never verdicts; expansion remains ongoing."},
 {capability:"research graph/hops",owner:"Pattern Hop",status:"partial",notes:"Provenance survives hops; durable lease source added, live storage integration remains."},
 {capability:"memory/continuity",owner:"Arbor Layer + durable stores",status:"partial",notes:"Supersession/scope and full export activation remain acceptance work."},
] as const;
export function duplicateOwners(){const seen=new Map<string,string>();const dup:string[]=[];for(const row of ONE_ARBOR_CAPABILITY_MAP){if(seen.has(row.capability))dup.push(row.capability);else seen.set(row.capability,row.owner);}return dup;}
