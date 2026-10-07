export type GoldExemplarDescriptor={
 id:string;
 anchor:string;
 chapterNumber:number;
 sourceSha256:string;
 sceneFunction:string;
 character?:string;
 reason:string;
 status:"candidate"|"validated"|"invalidated";
 validationEvidence?:string[];
};

/**
 * Descriptor-only catalog. Manuscript prose is intentionally not embedded here.
 * A descriptor may become runtime VoiceEvidence only after exact source text is
 * loaded from the canonical source, hash-bound, and status === "validated".
 *
 * The older whole-book structural Gold record is NOT copied here because its
 * durable record explicitly says it was generated before chapters 29-60 were
 * actually read and is therefore invalidated evidence.
 */
export const ANNABELLE_GOLD_EXEMPLAR_CANDIDATES:readonly GoldExemplarDescriptor[]=[
 {id:"gold-ch09-grief",anchor:"Camping/KJ disclosure",chapterNumber:9,sourceSha256:"1a7e9f3d5ca13e06e49798a57de8f7cfac6e8549bdb73aedc9e6122324c5465b",sceneFunction:"grief-disclosure",character:"Ever",reason:"Trauma/grief remains concrete, bodily and unsentimental; comfort does not erase loss.",status:"candidate"},
 {id:"gold-ch10-safety",anchor:"Carnival exit-vigilance beat",chapterNumber:10,sourceSha256:"19a559f48f91e2f23205cd1e398b6a1a459d9b4ec31c6dccc7b457179bf537af",sceneFunction:"earned-safety",character:"Ever",reason:"Safety is represented as reduced surveillance labor rather than protection exposition.",status:"candidate"},
 {id:"gold-ch20-repair",anchor:"Will apology",chapterNumber:20,sourceSha256:"a43f4a2338abe478007dbae15d1b595c9dfe90017e4c3c4a478af42fa9ee3471",sceneFunction:"relationship-repair",character:"Will",reason:"Repair must restore agency through choices and future behavior rather than demand absolution.",status:"candidate"},
 {id:"gold-ch39-call",anchor:"The Call",chapterNumber:39,sourceSha256:"02a8e82359612f604f50ab103dab9dab57995c2491da47f7d915c56e0bb4408f",sceneFunction:"recognition-under-threat",character:"Will",reason:"Practical stakes and emotional rupture remain simultaneous without forcing coherence.",status:"candidate"},
 {id:"gold-ch50-recovery",anchor:"Aftermath Hospital",chapterNumber:50,sourceSha256:"152da1e353a4c1057924029a78973192b9f63dbb4c1af8a4eae842dae9983407",sceneFunction:"recovery",character:"Ever",reason:"Recovery is carried by concrete choices, environment and practical care rather than healing declarations.",status:"candidate"},
];

export function validatedGoldExemplars(rows:readonly GoldExemplarDescriptor[]):GoldExemplarDescriptor[]{
 return rows.filter(x=>x.status==="validated");
}

export function goldCatalogWarnings(rows:readonly GoldExemplarDescriptor[]):string[]{
 const out:string[]=[];
 if(rows.some(x=>x.status==="candidate"))out.push("Candidate Gold anchors require explicit validation against exact canonical prose before calibration.");
 if(!rows.some(x=>x.status==="validated"))out.push("No mature Gold prose is currently validated; voice calibration must remain evidence-limited.");
 return out;
}
