export type EvidenceChannel="messages"|"phone"|"calendar"|"travel"|"payment"|"witness"|"original_document";
export type EvidenceCoverageInput={eventKey:string;channel:EvidenceChannel;observedRefs:readonly string[];checkedRefs:readonly string[]};
export type EvidenceCoverageRow={eventKey:string;channels:Readonly<Record<EvidenceChannel,"not_observed"|"unchecked"|"partial"|"checked">>;openChannels:readonly EvidenceChannel[];status:"coverage_not_truth"};
const channels:readonly EvidenceChannel[]=["messages","phone","calendar","travel","payment","witness","original_document"];
const req=(v:unknown,k:string)=>{if(typeof v!=="string"||!v.trim()||v.length>1000)throw Error("invalid_coverage_matrix_"+k);return v.trim();};
const uniq=(v:readonly string[])=>[...new Set(v.map(x=>req(x,"evidence_ref")))];

export function buildEvidenceCoverageMatrix(input:readonly EvidenceCoverageInput[]):readonly EvidenceCoverageRow[]{
  const rows=input.map(r=>{const observed=uniq(r.observedRefs),checked=uniq(r.checkedRefs);if(checked.some(x=>!observed.includes(x)))throw Error("coverage_matrix_checked_not_observed");
    return{eventKey:req(r.eventKey,"event_key"),channel:r.channel,observed,checked};});
  const keys=[...new Set(rows.map(r=>r.eventKey))].sort();
  return keys.map(eventKey=>{
    const state={} as Record<EvidenceChannel,"not_observed"|"unchecked"|"partial"|"checked">;
    for(const c of channels){const x=rows.filter(r=>r.eventKey===eventKey&&r.channel===c),o=uniq(x.flatMap(r=>r.observed)),k=uniq(x.flatMap(r=>r.checked));
      state[c]=o.length===0?"not_observed":k.length===0?"unchecked":k.length<o.length?"partial":"checked";}
    const openChannels=channels.filter(c=>state[c]==="unchecked"||state[c]==="partial");
    return{eventKey,channels:state,openChannels,status:"coverage_not_truth" as const};
  });
}
