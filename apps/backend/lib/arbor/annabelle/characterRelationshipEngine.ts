export type CharacterState = {
  name:string;
  chapter:number;
  knowledge:string[];
  injuries:string[];
  boundaries:string[];
  speechTraits:string[];
  noticing:string[];
};
export type RelationshipState = {
  pair:string;
  chapter:number;
  stage:string;
  trust:number;
  allowedTouch:string[];
  disclosures:string[];
  ruptures:string[];
  repairs:string[];
};
export type IntegrityIssue={kind:"knowledge-leak"|"injury-drop"|"boundary-drift"|"relationship-regression";subject:string;message:string;chapter:number};

export function checkCharacterRelationshipIntegrity(input:{
  characters:readonly CharacterState[];
  relationships:readonly RelationshipState[];
}):IntegrityIssue[]{
  const issues:IntegrityIssue[]=[];
  const byCharacter=new Map<string,CharacterState[]>();
  for(const s of input.characters)(byCharacter.get(s.name)??(byCharacter.set(s.name,[]),byCharacter.get(s.name)!)).push(s);
  for(const [name,states] of byCharacter){
    states.sort((a,b)=>a.chapter-b.chapter);
    for(let i=1;i<states.length;i++){
      const prev=states[i-1],cur=states[i];
      for(const injury of prev.injuries) if(!cur.injuries.includes(injury)&&!cur.knowledge.some(k=>k===`resolved:${injury}`))
        issues.push({kind:"injury-drop",subject:name,chapter:cur.chapter,message:`Injury "${injury}" disappeared without recorded resolution.`});
      for(const boundary of prev.boundaries) if(!cur.boundaries.includes(boundary)&&!cur.knowledge.some(k=>k===`changed-boundary:${boundary}`))
        issues.push({kind:"boundary-drift",subject:name,chapter:cur.chapter,message:`Boundary "${boundary}" changed without recorded evidence.`});
    }
  }
  const byPair=new Map<string,RelationshipState[]>();
  for(const s of input.relationships)(byPair.get(s.pair)??(byPair.set(s.pair,[]),byPair.get(s.pair)!)).push(s);
  for(const [pair,states] of byPair){
    states.sort((a,b)=>a.chapter-b.chapter);
    for(let i=1;i<states.length;i++){
      const prev=states[i-1],cur=states[i];
      if(cur.trust<prev.trust && cur.ruptures.length===0)
        issues.push({kind:"relationship-regression",subject:pair,chapter:cur.chapter,message:"Trust regressed without a recorded rupture."});
      if(cur.trust>prev.trust && cur.repairs.length===0 && cur.disclosures.length===0)
        issues.push({kind:"relationship-regression",subject:pair,chapter:cur.chapter,message:"Trust advanced without recorded repair/disclosure evidence."});
    }
  }
  return issues;
}
