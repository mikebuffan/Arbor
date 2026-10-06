export type MovementBeat={
 character:string;
 action:string;
 supports:string[];
 activeInjuries:string[];
 compensations:string[];
 loadBearing?:string;
 transition?:string;
};
export type MovementIssue={kind:"injury-ignored"|"support-missing"|"geometry-missing";message:string};

export function inspectMovementMechanics(beat:MovementBeat):MovementIssue[]{
 const out:MovementIssue[]=[];
 if(beat.activeInjuries.length&&beat.compensations.length===0)
  out.push({kind:"injury-ignored",message:"Active injury has no recorded compensation or explicit reason it does not affect movement."});
 if(/stand|rise|get up|stairs|run|jump|lift/i.test(beat.action)&&beat.activeInjuries.length&&beat.supports.length===0&&beat.compensations.length===0)
  out.push({kind:"support-missing",message:"Load/transition movement with active injury has no support or compensation evidence."});
 if(!beat.loadBearing&&!beat.transition&&/grab|catch|lift|carry|fall|kneel|stand|sit/i.test(beat.action))
  out.push({kind:"geometry-missing",message:"Mechanically significant action lacks load-bearing or transition geometry."});
 return out;
}
