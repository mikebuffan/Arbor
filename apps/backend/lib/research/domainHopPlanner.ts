import type {TravelVerification} from "./travelVerification";
import type {PaymentChainAssessment} from "./paymentChain";
import type {WitnessClaimCheck} from "./witnessCrossCheck";
import type {EvidenceCoverageRow, EvidenceChannel} from "./evidenceCoverageMatrix";
import type {SourcePreference} from "./sourcePreference";
import type {PropagatedClaimConfidence} from "./contradictionPropagation";

export type DomainHopKind=
  | "verify_actual_travel" | "verify_traveler_presence" | "seek_direct_payment_record"
  | "cross_check_witness" | "fill_coverage" | "seek_original_source" | "review_propagated_contradiction";

export type DomainHopDirective={
  hopId:string;
  kind:DomainHopKind;
  query:string;
  reason:string;
  priority:number;
  triggerEvidenceRefs:readonly string[];
  status:"prepared_not_executed";
};

const uniq=(v:readonly string[])=>[...new Set(v)].sort();
const safe=(v:string)=>v.replace(/[^A-Za-z0-9._:@-]+/g," ").trim();

export function planDomainResearchHops(input:{
  travel?:readonly TravelVerification[];
  payments?:readonly PaymentChainAssessment[];
  witnessChecks?:readonly WitnessClaimCheck[];
  coverage?:readonly EvidenceCoverageRow[];
  sourcePreferences?:readonly SourcePreference[];
  propagatedClaims?:readonly PropagatedClaimConfidence[];
}):readonly DomainHopDirective[]{
  const out:DomainHopDirective[]=[];
  const add=(kind:DomainHopKind,key:string,query:string,reason:string,priority:number,refs:readonly string[])=>{
    const triggerEvidenceRefs=uniq(refs);
    if(!triggerEvidenceRefs.length)return;
    out.push({hopId:[kind,key].join(":"),kind,query:safe(query),reason,priority,triggerEvidenceRefs,status:"prepared_not_executed"});
  };

  for(const t of input.travel??[]){
    if(t.status==="planned_only")
      add("verify_actual_travel",t.tripRef,t.tripRef+" actual flight movement airport tail log manifest customs pilot log",
        "itinerary_without_actual_movement",.95,t.evidenceRefs);
    else if(t.status==="movement_supported"&&t.travelerSupport.length===0)
      add("verify_traveler_presence",t.tripRef,t.tripRef+" manifest customs traveler passenger airport record",
        "aircraft_movement_without_traveler_presence",.9,t.actualMovementRefs.length?t.actualMovementRefs:t.evidenceRefs);
  }

  for(const p of input.payments??[]){
    if(p.status==="witness_only"||p.status==="cash_availability_only")
      add("seek_direct_payment_record",p.paymentRef,p.paymentRef+" receipt ledger bank transaction reimbursement staff household payment record",
        p.status==="witness_only"?"payment_report_without_transaction_record":"cash_availability_without_payment_record",
        .94,p.evidenceRefs);
  }

  for(const w of input.witnessChecks??[]){
    if(w.independentSupportFamilies.length===0&&w.independentCounterFamilies.length===0)
      add("cross_check_witness",w.claimId,w.topicKey+" phone calendar travel payment message independent witness",
        "witness_claim_lacks_independent_cross_check",.86,
        [...w.claimEvidenceRefs,...w.supportRefs,...w.counterRefs,...w.contextualRefs]);
  }

  const channelPriority:Record<EvidenceChannel,number>={
    messages:.78,phone:.88,calendar:.84,travel:.9,payment:.92,witness:.82,original_document:.89,
  };
  for(const row of input.coverage??[])for(const channel of row.openChannels)
    add("fill_coverage",row.eventKey+":"+channel,row.eventKey+" "+channel+" source record",
      "event_channel_not_fully_checked",channelPriority[channel],row.evidenceRefs);

  for(const s of input.sourcePreferences??[])if(s.reviewAction==="seek_original")
    add("seek_original_source",s.evidenceRef,s.evidenceRef+" original record exhibit scan ledger log transcript",
      "summary_or_copy_without_original",.9,[s.evidenceRef]);

  for(const c of input.propagatedClaims??[])if(c.adjustedConfidence<c.baseConfidence)
    add("review_propagated_contradiction",c.claimId,c.claimId+" contradiction counterevidence dependent claims",
      "upstream_contradiction_weakened_claim",.97,c.evidenceRefs);

  const best=new Map<string,DomainHopDirective>();
  for(const d of out){const prev=best.get(d.hopId);if(!prev||d.priority>prev.priority)best.set(d.hopId,d);}
  return [...best.values()].sort((a,b)=>b.priority-a.priority||a.hopId.localeCompare(b.hopId));
}
