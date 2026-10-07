export type VoiceEvidence={
 text:string;
 sourceSha256:string;
 gold?:boolean;
 doNotTouch?:boolean;
 character?:string;
 sceneFunction?:string;
 mature?:boolean;
};
export type VoiceDiagnostic={kind:"explanation"|"camera"|"inflation"|"generic-body"|"protected";message:string;evidence:string};

const rules=[
 ["explanation",/\b(which meant|this meant|in other words|the point was|she realized|he realized)\b/i,"Trust the reader where evidence already carries meaning."],
 ["camera",/\b(unbeknownst to|she couldn't see that|he couldn't see that)\b/i,"Possible close-third camera leak."],
 ["inflation",/\b(something primal|something ancient|beautifully broken|perfectly imperfect|dangerously beautiful)\b/i,"Possible writer-performance language."],
 ["generic-body",/\b(heart hammered|breath caught|stomach dropped|pulse jumped)\b/i,"Generic body shorthand; check for character-specific mechanics."],
] as const;

export function inspectAnnabelleVoice(text:string,protectedEvidence:readonly VoiceEvidence[]=[]):VoiceDiagnostic[]{
 const out:VoiceDiagnostic[]=[];
 for(const e of protectedEvidence) if((e.gold||e.doNotTouch)&&text.includes(e.text))
   out.push({kind:"protected",message:"Gold/do-not-touch prose is present; preserve unless explicitly overridden.",evidence:e.text});
 for(const [kind,re,message] of rules){const m=text.match(re);if(m)out.push({kind,message,evidence:m[0]});}
 return out;
}

const words=(value:string)=>value.toLowerCase().match(/[a-z0-9']+/g)??[];
const validSha=(value:string)=>/^[a-f0-9]{64}$/i.test(value);

export type VoiceCalibrationMatch={
 sourceSha256:string;
 character?:string;
 sceneFunction?:string;
 overlap:number;
};
export type VoiceCalibrationResult={
 sourceBackedGold:number;
 matches:VoiceCalibrationMatch[];
 sufficientEvidence:boolean;
 warnings:string[];
};

export function calibrateMatureAnnabelleVoice(input:{
 text:string;
 evidence:readonly VoiceEvidence[];
 character?:string;
 sceneFunction?:string;
 maxMatches?:number;
}):VoiceCalibrationResult{
 const target=new Set(words(input.text));
 const eligible=input.evidence.filter(e=>
   e.gold===true &&
   e.mature!==false &&
   validSha(e.sourceSha256) &&
   e.text.trim().length>0 &&
   (!input.character||!e.character||e.character===input.character) &&
   (!input.sceneFunction||!e.sceneFunction||e.sceneFunction===input.sceneFunction)
 );
 const matches=eligible.map(e=>{
   const exemplar=[...new Set(words(e.text))];
   const shared=exemplar.filter(w=>target.has(w)).length;
   const overlap=exemplar.length?shared/exemplar.length:0;
   return{sourceSha256:e.sourceSha256,character:e.character,sceneFunction:e.sceneFunction,overlap:Number(overlap.toFixed(3))};
 }).sort((a,b)=>b.overlap-a.overlap).slice(0,input.maxMatches??5);
 const warnings:string[]=[];
 if(!eligible.length)warnings.push("No source-backed mature Gold exemplars are available for this scope; do not invent a voice verdict.");
 if(input.character&&!eligible.some(e=>e.character===input.character))warnings.push(`No character-specific Gold exemplar for ${input.character}; treat calibration as incomplete.`);
 return{sourceBackedGold:eligible.length,matches,sufficientEvidence:eligible.length>0,warnings};
}

export function matureVoicePromptBlock(result:VoiceCalibrationResult):string{
 return [
  "ANNABELLE MATURE VOICE CALIBRATION — SOURCE-BACKED GOLD ONLY",
  `Gold exemplars in scope: ${result.sourceBackedGold}`,
  ...result.matches.map(x=>`- source=${x.sourceSha256.slice(0,12)} overlap=${x.overlap} character=${x.character??"unspecified"} scene=${x.sceneFunction??"unspecified"}`),
  ...result.warnings.map(w=>`WARNING: ${w}`),
  "Similarity is evidence for comparison, not permission to imitate a single passage or override canon.",
 ].join("\n");
}

export const ANNABELLE_VOICE_CONTRACT=[
 "Close adult third; focal character evidence bounds the camera.",
 "Body/environment evidence before interpretation when the scene supports it.",
 "Evidence -> bodily consequence -> action/choice; dialogue need not explain what the reader already knows.",
 "Restraint beats writer-performance.",
 "Humor is character-specific and imperfect, not a banter machine.",
 "Repeated language is classified for intent before removal.",
 "Gold/do-not-touch prose survives diagnostics unless explicitly overridden.",
 "Mature voice calibration uses source-backed Gold evidence; missing evidence stays missing rather than becoming invented canon.",
] as const;
