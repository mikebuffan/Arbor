export type RepetitionOccurrence={chapter:number;text:string;kind:"phrase"|"body"|"metaphor"|"sensory"};
export type RepetitionFinding={key:string;chapters:number[];count:number;classification:"review"|"motif-candidate"|"high-risk";kind:RepetitionOccurrence["kind"]};

const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9' ]/g," ").replace(/\s+/g," ").trim();
export function analyzeManuscriptRepetition(input:{occurrences:readonly RepetitionOccurrence[];intentionalMotifs?:readonly string[]}):RepetitionFinding[]{
 const motifs=new Set((input.intentionalMotifs??[]).map(norm));const map=new Map<string,{kind:RepetitionOccurrence["kind"];chapters:number[]}>();
 for(const o of input.occurrences){const key=norm(o.text);if(!key)continue;const row=map.get(key)??{kind:o.kind,chapters:[]};row.chapters.push(o.chapter);map.set(key,row);}
 return [...map.entries()].filter(([,v])=>v.chapters.length>=2).map(([key,v])=>{
   const chapters=[...new Set(v.chapters)].sort((a,b)=>a-b);const count=v.chapters.length;
   const classification:RepetitionFinding["classification"]=motifs.has(key)?"motif-candidate":count>=5||chapters.length>=4?"high-risk":"review";
   return{key,chapters,count,classification,kind:v.kind};
 }).sort((a,b)=>b.count-a.count);
}
