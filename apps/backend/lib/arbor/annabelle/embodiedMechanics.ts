export type EmbodiedBeat={stimulus:string;involuntary:string[];propagation:string[];action:string[];declaredMeaning?:string};
export type TouchBeat={initiator:string;placement:string;pressure?:string;duration?:string;response?:string;withdrawal?:string;choiceVisible:boolean;relationshipStage?:string};
export type MechanicsIssue={kind:string;message:string};
export function inspectEmbodiedBeat(beat:EmbodiedBeat):MechanicsIssue[]{
 const out:MechanicsIssue[]=[];
 if(!beat.stimulus.trim())out.push({kind:"missing-stimulus",message:"Body response lacks a grounded stimulus."});
 if(!beat.involuntary.length)out.push({kind:"missing-body",message:"No involuntary/body evidence recorded."});
 if(!beat.action.length)out.push({kind:"missing-choice",message:"No resulting action/choice recorded."});
 if(beat.declaredMeaning&&!beat.propagation.length)out.push({kind:"meaning-jump",message:"Meaning is declared before propagation/evidence is shown."});
 return out;
}
export function inspectTouchBeat(beat:TouchBeat):MechanicsIssue[]{
 const out:MechanicsIssue[]=[];
 if(!beat.initiator||!beat.placement)out.push({kind:"touch-geometry",message:"Touch lacks initiator or placement."});
 if(!beat.choiceVisible)out.push({kind:"choice",message:"Touch/intimacy beat lacks visible choice; body response alone cannot establish consent."});
 if(!beat.response&&!beat.withdrawal)out.push({kind:"response",message:"Touch has no observable response or withdrawal residue."});
 return out;
}
