export type AnnabelleSeverity = "note" | "watch" | "revise";
export type AnnabelleDiagnostic = {
  engine: string;
  severity: AnnabelleSeverity;
  message: string;
  evidence: string[];
  count?: number;
};

const countMatches = (text: string, re: RegExp) => [...text.matchAll(re)].length;
const evidence = (text: string, re: RegExp, limit = 5) =>
  [...text.matchAll(re)].slice(0, limit).map(m => m[0]);

const DEFAULT_SENSORY: Record<string, RegExp> = {
  coffee: /\bcoffee\b/gi,
  wool: /\bwool(?:en)?\b/gi,
  citrus: /\bcitrus\b|\blemon\b|\borange\b|\bbergamot\b/gi,
  cedar: /\bcedar\b/gi,
  spice: /\bspice[ds]?\b|\bspicy\b/gi,
  rain: /\brain(?:ed|ing|y)?\b/gi,
  "wet pavement": /\bwet pavement\b/gi,
  "cut grass": /\b(?:freshly )?cut grass\b/gi,
};

const ARCHIVE_HUMOR = /\b(chain of custody|provenance|institutional support|historical research|preservation order|archival|archive joke|evidence, not permission)\b/gi;
const FACE_LOUD = /\b(your face (?:is|was|has|had|said|says|did)|my face (?:is|was|has|had|said|says|did)|your face is loud|i haven't spoken|you didn't have to)\b/gi;
const INTERNAL_TICS = /\b(well|apparently|excellent|fantastic)\b[.!?]?/gi;
const NOT_X_Y = /(?:^|[.!?]\s+)(?:Not|No)\s+[^.!?]{1,60}[.!?]\s+[A-Z][^.!?]{1,60}[.!?]/gm;

function sensoryDefaults(text: string): AnnabelleDiagnostic[] {
  return Object.entries(DEFAULT_SENSORY).flatMap(([name,re]) => {
    const n=countMatches(text,re);
    return n >= 3 ? [{engine:"sensory-expansion",severity:n>=5?"revise":"watch",message:`Repeated default sensory token "${name}" (${n}). Expand what is noticed; do not synonym-swap.`,evidence:evidence(text,re),count:n} as AnnabelleDiagnostic] : [];
  });
}
function humorDensity(text:string):AnnabelleDiagnostic[]{
  const out:AnnabelleDiagnostic[]=[];
  for(const [engine,re,threshold,msg] of [
    ["archive-humor",ARCHIVE_HUMOR,2,"Archive/evidence humor is recurring; keep only context-earned instances."],
    ["face-loud-family",FACE_LOUD,2,"Face-says-it shorthand is recurring; prefer human pauses, interruption, failed starts, looks or silence."],
  ] as const){const n=countMatches(text,re);if(n>=threshold)out.push({engine,severity:n>=threshold+2?"revise":"watch",message:msg,evidence:evidence(text,re),count:n});}
  return out;
}
function proseTics(text:string):AnnabelleDiagnostic[]{
  const out:AnnabelleDiagnostic[]=[];
  const t=countMatches(text,INTERNAL_TICS); if(t>=6) out.push({engine:"prose-tics",severity:t>=10?"revise":"watch",message:"Internal-commentary defaults are clustering. Preserve only character-earned uses.",evidence:evidence(text,INTERNAL_TICS),count:t});
  const n=countMatches(text,NOT_X_Y); if(n>=4) out.push({engine:"prose-tics",severity:n>=7?"revise":"watch",message:"Not-X/Y contrast construction is clustering. Protect high-impact uses and vary the rest.",evidence:evidence(text,NOT_X_Y),count:n});
  return out;
}
function dialogueNaturalism(text:string):AnnabelleDiagnostic[]{
  const dialogue=[...text.matchAll(/“([^”]{1,300})”/g)].map(m=>m[1]);
  if(dialogue.length<8)return[];
  let polished=0;
  for(let i=1;i<dialogue.length;i++){
    const a=dialogue[i-1],b=dialogue[i];
    if(/[.!?]$/.test(a)&&/[.!?]$/.test(b)&&a.length<120&&b.length<120&&!/[—…]/.test(a+b)) polished++;
  }
  const ratio=polished/Math.max(1,dialogue.length-1);
  return ratio>.72?[{engine:"dialogue-naturalism",severity:ratio>.85?"revise":"watch",message:"Dialogue has a high run of clean turn-taking. Check for pauses, interruptions, hesitation, overlap, nonverbal answers and imperfect reactions where character-true.",evidence:[],count:polished}]:[];
}
function repetition(text:string):AnnabelleDiagnostic[]{
  const paras=text.split(/\n\s*\n/).map(x=>x.trim()).filter(x=>x.length>35);
  const seen=new Map<string,number>(); const dup:string[]=[];
  for(const p of paras){const k=p.toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").slice(0,180);const n=(seen.get(k)||0)+1;seen.set(k,n);if(n===2)dup.push(p.slice(0,180));}
  return dup.length?[{engine:"duplicate-assembly",severity:"revise",message:"Near-identical paragraph openings recur; inspect for draft assembly duplication.",evidence:dup.slice(0,5),count:dup.length}]:[];
}
export function runAnnabelleEditorialDiagnostics(text:string):AnnabelleDiagnostic[]{
  return [...sensoryDefaults(text),...humorDensity(text),...proseTics(text),...dialogueNaturalism(text),...repetition(text)];
}
