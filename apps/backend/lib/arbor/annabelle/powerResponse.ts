export type PowerBeat={chapter:number;subject:string;trigger:string;behaviors:string[];labels:string[]};
const behavior=/\b(interrupt|talk over|block|corner|deflect|blame|mock|dismiss|raise voice|go quiet|leave|withhold|threaten|control space|move closer)\b/i;
const essay=/\b(male fragility|fragile ego|needed control|couldn't stand being wrong|loss of control)\b/i;
export function inspectPowerBeat(beat:PowerBeat):{grounded:boolean;warnings:string[]}{
 const warnings:string[]=[];
 const grounded=beat.behaviors.some(x=>behavior.test(x));
 if(!grounded)warnings.push("Power response has no concrete behavior/space/status evidence.");
 if(beat.labels.some(x=>essay.test(x))&&!grounded)warnings.push("Power/fragility is named without behavioral evidence.");
 return{grounded,warnings};
}
