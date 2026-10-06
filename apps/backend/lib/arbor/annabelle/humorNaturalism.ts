export type HumorBeat={speaker:string;text:string;response?:string;interrupted?:boolean;silenceAfter?:boolean;callbackKey?:string};
export type HumorReport={perfectLadderRisk:boolean;earnedCallbacks:string[];failedOrImperfect:number;warnings:string[]};

export function analyzeHumorNaturalism(beats:readonly HumorBeat[]):HumorReport{
  let polishedRun=0,maxPolished=0,failedOrImperfect=0;const earnedCallbacks:string[]=[];const seen=new Set<string>();const warnings:string[]=[];
  for(const beat of beats){
    const clean=Boolean(beat.text.trim())&&!beat.interrupted&&!beat.silenceAfter&&Boolean(beat.response?.trim());
    polishedRun=clean?polishedRun+1:0;maxPolished=Math.max(maxPolished,polishedRun);
    if(beat.interrupted||beat.silenceAfter||!beat.response?.trim())failedOrImperfect++;
    if(beat.callbackKey){if(seen.has(beat.callbackKey))earnedCallbacks.push(beat.callbackKey);else seen.add(beat.callbackKey);}
  }
  if(maxPolished>=4)warnings.push("Four or more clean joke/reply turns form a perfect-banter ladder; verify this is character-earned.");
  if(beats.length>=6&&failedOrImperfect===0)warnings.push("Humor run has no interruption, silence, miss, hesitation, or failed reaction.");
  return{perfectLadderRisk:maxPolished>=4,earnedCallbacks:[...new Set(earnedCallbacks)],failedOrImperfect,warnings};
}
