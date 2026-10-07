export type PhysicalState={
  chapter:number;
  character:string;
  injuries:Record<string,"acute"|"healing"|"chronic"|"resolved">;
  compensations:string[];
  scars:string[];
  fatigue?:0|1|2|3|4|5;
  supports?:string[];
};
export type PhysicalContinuityIssue={chapter:number;character:string;kind:"injury-drop"|"scar-drop"|"compensation-drop"|"fatigue-jump";message:string};

export function inspectPhysicalContinuity(states:readonly PhysicalState[]):PhysicalContinuityIssue[]{
  const out:PhysicalContinuityIssue[]=[];
  const groups=new Map<string,PhysicalState[]>();
  for(const s of states)(groups.get(s.character)??(groups.set(s.character,[]),groups.get(s.character)!)).push(s);
  for(const [character,rows] of groups){
    rows.sort((a,b)=>a.chapter-b.chapter);
    for(let i=1;i<rows.length;i++){
      const prev=rows[i-1],cur=rows[i];
      for(const [injury,status] of Object.entries(prev.injuries)){
        if(status!=="resolved" && cur.injuries[injury]===undefined)
          out.push({chapter:cur.chapter,character,kind:"injury-drop",message:`Injury "${injury}" vanished without a resolved state.`});
      }
      for(const scar of prev.scars) if(!cur.scars.includes(scar))
        out.push({chapter:cur.chapter,character,kind:"scar-drop",message:`Scar "${scar}" vanished from tracked physical state.`});
      for(const compensation of prev.compensations) if(!cur.compensations.includes(compensation) && Object.values(cur.injuries).some(x=>x!=="resolved"))
        out.push({chapter:cur.chapter,character,kind:"compensation-drop",message:`Compensation "${compensation}" disappeared while injury remains active.`});
      if(prev.fatigue!==undefined&&cur.fatigue!==undefined&&Math.abs(cur.fatigue-prev.fatigue)>=4)
        out.push({chapter:cur.chapter,character,kind:"fatigue-jump",message:"Fatigue changed abruptly; verify elapsed time or scene evidence."});
    }
  }
  return out;
}
