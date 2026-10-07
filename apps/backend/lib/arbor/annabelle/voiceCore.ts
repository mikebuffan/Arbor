export type VoiceEvidence={text:string;sourceSha256:string;gold?:boolean;doNotTouch?:boolean};
export type VoiceDiagnostic={kind:"explanation"|"camera"|"inflation"|"generic-body"|"protected";message:string;evidence:string};
const rules=[
 ["explanation",/\b(which meant|this meant|in other words|the point was|she realized|he realized)\b/i,"Trust the reader where evidence already carries meaning."],
 ["camera",/\b(unbeknownst to|she couldn't see that|he couldn't see that)\b/i,"Possible close-third camera leak."],
 ["inflation",/\b(something primal|something ancient|beautifully broken|perfectly imperfect|dangerously beautiful)\b/i,"Possible writer-performance language."],
 ["generic-body",/\b(heart hammered|breath caught|stomach dropped|pulse jumped)\b/i,"Generic body shorthand; check for character-specific mechanics."],
] as const;
export function inspectAnnabelleVoice(text:string,protectedEvidence:readonly VoiceEvidence[]=[]):VoiceDiagnostic[]{
 const out:VoiceDiagnostic[]=[];
 for(const e of protectedEvidence) if((e.gold||e.doNotTouch)&&text.includes(e.text)) out.push({kind:"protected",message:"Gold/do-not-touch prose is present; preserve unless explicitly overridden.",evidence:e.text});
 for(const [kind,re,message] of rules){const m=text.match(re);if(m)out.push({kind,message,evidence:m[0]});}
 return out;
}
export const ANNABELLE_VOICE_CONTRACT=[
 "Close adult third; focal character evidence bounds the camera.",
 "Body/environment evidence before interpretation when the scene supports it.",
 "Evidence -> bodily consequence -> action/choice; dialogue need not explain what the reader already knows.",
 "Restraint beats writer-performance.",
 "Humor is character-specific and imperfect, not a banter machine.",
 "Repeated language is classified for intent before removal.",
 "Gold/do-not-touch prose survives diagnostics unless explicitly overridden.",
] as const;
