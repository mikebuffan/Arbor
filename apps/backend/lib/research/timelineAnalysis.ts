export type TemporalRelation = "exact" | "approximate" | "before" | "after" | "range";
export type TimelineObservation = {
  observationId:string;
  entityIds:readonly string[];
  placeId:string|null;
  relation:TemporalRelation;
  startUtc:string|null;
  endUtc:string|null;
  reportedAtUtc:string|null;
  evidenceRefs:readonly string[];
};

export type TemporalConflict = {
  conflictId:string;
  leftObservationId:string;
  rightObservationId:string;
  reason:"non_overlapping_locations"|"impossible_order"|"event_after_report"|"invalid_range";
  evidenceRefs:readonly string[];
};

const text=(v:unknown,k:string,max=400):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_"+k);
  return v.trim();
};
const validDate=(v:string|null,k:string):string|null=>{
  if(v===null)return null;
  const x=text(v,k);
  if(!Number.isFinite(Date.parse(x)))throw new Error("invalid_"+k);
  return x;
};
const unique=(v:readonly string[],k:string)=>[...new Set(v.map(x=>text(x,k)))];

export function validateTimelineObservation(o:TimelineObservation):TimelineObservation{
  const observationId=text(o.observationId,"timeline_observation_id");
  if(!["exact","approximate","before","after","range"].includes(o.relation))throw new Error("invalid_temporal_relation");
  const startUtc=validDate(o.startUtc,"timeline_start"),endUtc=validDate(o.endUtc,"timeline_end"),
    reportedAtUtc=validDate(o.reportedAtUtc,"timeline_reported_at");
  if(o.relation==="exact"&&(!startUtc||endUtc&&endUtc!==startUtc))throw new Error("exact_time_requires_single_timestamp");
  if(o.relation==="range"&&(!startUtc||!endUtc))throw new Error("range_requires_bounds");
  if(startUtc&&endUtc&&Date.parse(endUtc)<Date.parse(startUtc))throw new Error("invalid_timeline_range");
  const evidenceRefs=unique(o.evidenceRefs,"timeline_evidence_ref");
  if(!evidenceRefs.length)throw new Error("timeline_observation_requires_evidence");
  return {...o,observationId,entityIds:unique(o.entityIds,"timeline_entity_id"),
    placeId:o.placeId===null?null:text(o.placeId,"place_id"),startUtc,endUtc,reportedAtUtc,evidenceRefs};
}

function window(o:TimelineObservation):[number,number]|null{
  if(!o.startUtc)return null;
  const start=Date.parse(o.startUtc),end=o.endUtc?Date.parse(o.endUtc):start;
  return [start,end];
}

export function detectTemporalConflicts(observationsInput:readonly TimelineObservation[],options?:{
  minimumTravelMinutesBetweenPlaces?:number;
}):readonly TemporalConflict[]{
  const observations=observationsInput.map(validateTimelineObservation);
  const travelMs=(options?.minimumTravelMinutesBetweenPlaces??30)*60000;
  if(!Number.isFinite(travelMs)||travelMs<0)throw new Error("invalid_minimum_travel_minutes");
  const out:TemporalConflict[]=[];
  for(const o of observations){
    if(o.reportedAtUtc&&o.startUtc&&Date.parse(o.startUtc)>Date.parse(o.reportedAtUtc)&&o.relation==="exact"){
      out.push({conflictId:"event-after-report:"+o.observationId,leftObservationId:o.observationId,rightObservationId:o.observationId,
        reason:"event_after_report",evidenceRefs:o.evidenceRefs});
    }
  }
  for(let i=0;i<observations.length;i++)for(let j=i+1;j<observations.length;j++){
    const a=observations[i],b=observations[j];
    const shared=a.entityIds.some(id=>b.entityIds.includes(id));
    if(!shared)continue;
    const A=window(a),B=window(b);if(!A||!B)continue;
    if(a.placeId&&b.placeId&&a.placeId!==b.placeId){
      const separated=A[1]+travelMs<=B[0]||B[1]+travelMs<=A[0];
      if(!separated){
        out.push({conflictId:"location:"+a.observationId+":"+b.observationId,leftObservationId:a.observationId,rightObservationId:b.observationId,
          reason:"non_overlapping_locations",evidenceRefs:[...new Set([...a.evidenceRefs,...b.evidenceRefs])]});
      }
    }
    if(a.relation==="before"&&b.relation==="exact"&&A[0]>B[0]){
      out.push({conflictId:"order:"+a.observationId+":"+b.observationId,leftObservationId:a.observationId,rightObservationId:b.observationId,
        reason:"impossible_order",evidenceRefs:[...new Set([...a.evidenceRefs,...b.evidenceRefs])]});
    }
  }
  return out;
}

export type RecurringPattern = {
  key:string;
  observationIds:readonly string[];
  count:number;
  firstUtc:string;
  lastUtc:string;
};
export function detectRecurringPatterns(input:readonly {observationId:string;key:string;atUtc:string}[],minimumCount=3):readonly RecurringPattern[]{
  if(!Number.isSafeInteger(minimumCount)||minimumCount<2)throw new Error("invalid_pattern_minimum");
  const groups=new Map<string,{observationId:string;atUtc:string}[]>();
  for(const row of input){
    const key=text(row.key,"pattern_key"),id=text(row.observationId,"pattern_observation_id"),atUtc=validDate(row.atUtc,"pattern_at")!;
    groups.set(key,[...(groups.get(key)??[]),{observationId:id,atUtc}]);
  }
  return [...groups.entries()].flatMap(([key,rows])=>{
    if(rows.length<minimumCount)return[];
    const sorted=rows.sort((a,b)=>Date.parse(a.atUtc)-Date.parse(b.atUtc));
    return [{key,observationIds:sorted.map(r=>r.observationId),count:sorted.length,firstUtc:sorted[0].atUtc,lastUtc:sorted[sorted.length-1].atUtc}];
  }).sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
}

export type TranscriptAnswer = {
  turnId:string;
  topicKey:string;
  text:string;
  counselIntervened:boolean;
};
export type ResponsePatternShift = {
  turnId:string;
  topicKey:string;
  priorAverageWords:number;
  currentWords:number;
  recallLanguage:boolean;
  refusalLanguage:boolean;
  counselIntervened:boolean;
  magnitude:number;
};
/** Describes linguistic form only; does not infer deception, fear, guilt or motive. */
export function detectResponsePatternShifts(turns:readonly TranscriptAnswer[],windowSize=4):readonly ResponsePatternShift[]{
  if(!Number.isSafeInteger(windowSize)||windowSize<2||windowSize>20)throw new Error("invalid_shift_window");
  const out:ResponsePatternShift[]=[];const prior:number[]=[];
  for(const turn of turns){
    const id=text(turn.turnId,"turn_id"),topic=text(turn.topicKey,"topic_key"),body=text(turn.text,"turn_text",20000);
    const words=body.trim().split(/\s+/).filter(Boolean).length;
    const baseline=prior.slice(-windowSize);
    if(baseline.length>=2){
      const avg=baseline.reduce((a,b)=>a+b,0)/baseline.length;
      const magnitude=avg===0?0:Math.abs(words-avg)/avg;
      const recall=/\b(i do not recall|i don't recall|cannot recall|can't recall|do not remember|don't remember)\b/i.test(body);
      const refusal=/\b(i decline|i refuse|on advice of counsel|fifth amendment|plead the fifth)\b/i.test(body);
      if(magnitude>=0.6||recall||refusal||turn.counselIntervened){
        out.push({turnId:id,topicKey:topic,priorAverageWords:avg,currentWords:words,recallLanguage:recall,
          refusalLanguage:refusal,counselIntervened:turn.counselIntervened,magnitude});
      }
    }
    prior.push(words);
  }
  return out;
}
