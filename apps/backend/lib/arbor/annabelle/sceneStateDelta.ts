export type SceneState={
  knowledge:string[];
  relationships:Record<string,string>;
  body:string[];
  threats:string[];
  goals:string[];
  objects:Record<string,string>;
  motifs:string[];
};
export type SceneDelta={changed:boolean;dimensions:string[];details:string[]};
const diff=(a:readonly string[],b:readonly string[])=>b.filter(x=>!a.includes(x)).concat(a.filter(x=>!b.includes(x)).map(x=>`removed:${x}`));
export function sceneStateDelta(before:SceneState,after:SceneState):SceneDelta{
 const dimensions:string[]=[];const details:string[]=[];
 for(const [name,a,b] of [
  ["knowledge",before.knowledge,after.knowledge],["body",before.body,after.body],["threat",before.threats,after.threats],["goal",before.goals,after.goals],["motif",before.motifs,after.motifs],
 ] as const){const d=diff(a,b);if(d.length){dimensions.push(name);details.push(...d.map(x=>`${name}:${x}`));}}
 for(const [name,a,b] of [["relationship",before.relationships,after.relationships],["object",before.objects,after.objects]] as const){
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);const d=[...keys].filter(k=>a[k]!==b[k]);if(d.length){dimensions.push(name);details.push(...d.map(k=>`${name}:${k}:${a[k]??"none"}->${b[k]??"none"}`));}
 }
 return{changed:dimensions.length>0,dimensions:[...new Set(dimensions)],details};
}
