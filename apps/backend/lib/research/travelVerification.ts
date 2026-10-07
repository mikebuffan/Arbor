export type TravelEvidenceKind =
  | "itinerary" | "flight_movement" | "airport_record" | "tail_log"
  | "manifest" | "customs_record" | "pilot_log" | "witness" | "other";

export type TravelEvidence = {
  evidenceRef:string;
  sourceFamilyId:string;
  tripRef:string;
  kind:TravelEvidenceKind;
  origin:string|null;
  destination:string|null;
  departedAtUtc:string|null;
  arrivedAtUtc:string|null;
  travelerIds:readonly string[];
};

export type TravelVerification = {
  tripRef:string;
  status:"planned_only"|"movement_supported"|"traveler_presence_supported"|"conflicting_records";
  evidenceRefs:readonly string[];
  sourceFamilyIds:readonly string[];
  actualMovementRefs:readonly string[];
  travelerSupport:readonly {travelerId:string;evidenceRefs:readonly string[]}[];
  contradictions:readonly string[];
  note:"itinerary_is_not_actual_travel";
};

const req=(v:unknown,k:string,max=1000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_travel_"+k);
  return v.trim();
};
const opt=(v:string|null,k:string)=>v===null?null:req(v,k);
const utc=(v:string|null,k:string)=>{
  if(v===null)return null;
  const x=req(v,k);
  if(!Number.isFinite(Date.parse(x)))throw new Error("invalid_travel_"+k);
  return x;
};
const uniq=(v:readonly string[])=>[...new Set(v)].sort();
const actualKinds=new Set<TravelEvidenceKind>(["flight_movement","airport_record","tail_log","manifest","customs_record","pilot_log"]);
const travelerKinds=new Set<TravelEvidenceKind>(["manifest","customs_record","airport_record"]);

export function assessTravelVerification(input:readonly TravelEvidence[]):readonly TravelVerification[]{
  const rows=input.map(r=>({
    ...r,evidenceRef:req(r.evidenceRef,"evidence_ref"),sourceFamilyId:req(r.sourceFamilyId,"source_family_id"),
    tripRef:req(r.tripRef,"trip_ref"),origin:opt(r.origin,"origin"),destination:opt(r.destination,"destination"),
    departedAtUtc:utc(r.departedAtUtc,"departed_at"),arrivedAtUtc:utc(r.arrivedAtUtc,"arrived_at"),
    travelerIds:uniq(r.travelerIds.map(x=>req(x,"traveler_id",300))),
  }));
  if(new Set(rows.map(r=>r.evidenceRef)).size!==rows.length)throw new Error("duplicate_travel_evidence_ref");
  const groups=new Map<string,typeof rows>();
  for(const r of rows)groups.set(r.tripRef,[...(groups.get(r.tripRef)??[]),r]);
  return [...groups.entries()].map(([tripRef,g])=>{
    const actual=g.filter(r=>actualKinds.has(r.kind));
    const contradictions:string[]=[];
    const routes=uniq(actual.filter(r=>r.origin&&r.destination).map(r=>r.origin+"→"+r.destination));
    if(routes.length>1)contradictions.push("conflicting_actual_routes");
    const dep=actual.filter(r=>r.departedAtUtc).map(r=>Date.parse(r.departedAtUtc!));
    const arr=actual.filter(r=>r.arrivedAtUtc).map(r=>Date.parse(r.arrivedAtUtc!));
    if(dep.length&&arr.length&&Math.min(...arr)<Math.min(...dep))contradictions.push("arrival_before_departure");
    const travelerMap=new Map<string,string[]>();
    for(const r of g)if(travelerKinds.has(r.kind))for(const id of r.travelerIds)
      travelerMap.set(id,[...(travelerMap.get(id)??[]),r.evidenceRef]);
    const travelerSupport=[...travelerMap.entries()].map(([travelerId,refs])=>({travelerId,evidenceRefs:uniq(refs)}))
      .sort((a,b)=>a.travelerId.localeCompare(b.travelerId));
    let status:TravelVerification["status"]="planned_only";
    if(contradictions.length)status="conflicting_records";
    else if(travelerSupport.length)status="traveler_presence_supported";
    else if(actual.length)status="movement_supported";
    return {tripRef,status,evidenceRefs:uniq(g.map(r=>r.evidenceRef)),sourceFamilyIds:uniq(g.map(r=>r.sourceFamilyId)),
      actualMovementRefs:uniq(actual.map(r=>r.evidenceRef)),travelerSupport,contradictions:uniq(contradictions),
      note:"itinerary_is_not_actual_travel" as const};
  }).sort((a,b)=>a.tripRef.localeCompare(b.tripRef));
}
