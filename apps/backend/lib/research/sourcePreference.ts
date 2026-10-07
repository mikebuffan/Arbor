export type SourceLayer="original_record"|"authenticated_copy"|"sworn_testimony"|"official_summary"|"secondary_report"|"tertiary_repeat";
export type SourcePreferenceInput={evidenceRef:string;sourceFamilyId:string;layer:SourceLayer;originalAvailable:boolean};
export type SourcePreference={evidenceRef:string;sourceFamilyId:string;layer:SourceLayer;priority:number;reviewAction:"use_original"|"seek_original"|"use_with_provenance";status:"preference_not_truth"};
const req=(v:unknown,k:string)=>{if(typeof v!=="string"||!v.trim()||v.length>1000)throw Error("invalid_source_preference_"+k);return v.trim();};
const rank:Record<SourceLayer,number>={original_record:0,authenticated_copy:1,sworn_testimony:2,official_summary:3,secondary_report:4,tertiary_repeat:5};
export function rankSourcePreference(input:readonly SourcePreferenceInput[]):readonly SourcePreference[]{
 const rows=input.map(r=>({evidenceRef:req(r.evidenceRef,"evidence_ref"),sourceFamilyId:req(r.sourceFamilyId,"source_family_id"),layer:r.layer,originalAvailable:r.originalAvailable}));
 if(new Set(rows.map(r=>r.evidenceRef)).size!==rows.length)throw Error("duplicate_source_preference_evidence_ref");
 return rows.map(r=>({evidenceRef:r.evidenceRef,sourceFamilyId:r.sourceFamilyId,layer:r.layer,priority:rank[r.layer],
   reviewAction:r.layer==="original_record"?"use_original":r.originalAvailable?"use_original":"seek_original",status:"preference_not_truth" as const}))
   .sort((a,b)=>a.priority-b.priority||a.evidenceRef.localeCompare(b.evidenceRef));
}
