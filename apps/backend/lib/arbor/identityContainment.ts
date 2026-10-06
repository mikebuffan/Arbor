export type ArborSurface="text"|"voice"|"annabelle"|"grove"|"ark";
export type IdentityProjection={surface:ArborSurface;canonicalIdentityId:string;overlay:string|null;authority:"arbor"};
export function assertOneArborIdentity(projections:readonly IdentityProjection[]):void{
 const ids=new Set(projections.map(x=>x.canonicalIdentityId));
 if(ids.size>1)throw new Error("one_arbor_identity_split");
 for(const p of projections)if(p.authority!=="arbor")throw new Error("one_arbor_authority_split");
}
export function overlayMayOverrideIdentity(_:IdentityProjection):false{return false;}
