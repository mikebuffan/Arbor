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
function explanationRedundancy(text:string):AnnabelleDiagnostic[]{
  const sentences=text.split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
  const flags:string[]=[];
  for(let i=1;i<sentences.length;i++){
    const prior=new Set(sentences[i-1].toLowerCase().match(/[a-z']{5,}/g)??[]);
    const current=sentences[i].toLowerCase().match(/[a-z']{5,}/g)??[];
    const overlap=current.filter(w=>prior.has(w));
    if(overlap.length>=4 && /\b(because|meant|realized|understood|knew|that was|the point|the thing)\b/i.test(sentences[i])) flags.push(sentences[i].slice(0,180));
  }
  return flags.length?[{engine:"explanation-redundancy",severity:flags.length>=3?"revise":"watch",message:"Interpretive sentence closely repeats evidence already delivered. Check whether the reader can be trusted without the explanation.",evidence:flags.slice(0,5),count:flags.length}]:[];
}
function rhythm(text:string):AnnabelleDiagnostic[]{
  const sentences=text.match(/[^.!?]+[.!?]+/g)??[];
  if(sentences.length<20)return[];
  const short=sentences.filter(s=>(s.trim().match(/\b[\w’'-]+\b/g)??[]).length<=3).length;
  const ratio=short/sentences.length;
  return ratio>.32?[{engine:"rhythm",severity:ratio>.45?"revise":"watch",message:"Very-short sentence/fragment density is high. Protect intentional impact beats and vary the rest.",evidence:[],count:short}]:[];
}
function sceneChange(text:string):AnnabelleDiagnostic[]{
  if(text.length<1200)return[];
  const tail=text.slice(-700).toLowerCase();
  const change=/\b(decided|chose|left|stayed|learned|knew now|agreed|refused|opened|closed|called|went|returned|asked|told)\b/.test(tail);
  return change?[]:[{engine:"scene-change",severity:"note",message:"No obvious state-changing action appears near the scene ending. Verify what changed in knowledge, relationship, body, decision, threat or goal.",evidence:[]}];
}
function repetition(text:string):AnnabelleDiagnostic[]{
  const paras=text.split(/\n\s*\n/).map(x=>x.trim()).filter(x=>x.length>35);
  const seen=new Map<string,number>(); const dup:string[]=[];
  for(const p of paras){const k=p.toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").slice(0,180);const n=(seen.get(k)||0)+1;seen.set(k,n);if(n===2)dup.push(p.slice(0,180));}
  return dup.length?[{engine:"duplicate-assembly",severity:"revise",message:"Near-identical paragraph openings recur; inspect for draft assembly duplication.",evidence:dup.slice(0,5),count:dup.length}]:[];
}
export function runAnnabelleEditorialDiagnostics(text:string):AnnabelleDiagnostic[]{
  return [...sensoryDefaults(text),...humorDensity(text),...proseTics(text),...dialogueNaturalism(text),...explanationRedundancy(text),...rhythm(text),...sceneChange(text),...touchSpecificity(text),...powerResponse(text),...environmentPresence(text),...repetition(text)];
}

const EXPLANATION_MARKERS = /\b(this meant|which meant|because she knew|because he knew|the point was|that was the thing|what he wanted was|what she wanted was|in other words)\b/gi;
const BODY_DEFAULTS = /\b(breath caught|heart hammered|jaw tightened|shoulders tightened|stomach dropped|pulse jumped|she swallowed|he swallowed)\b/gi;

function explanationRedundancy(text:string):AnnabelleDiagnostic[]{
  const n=countMatches(text,EXPLANATION_MARKERS);
  return n>=3?[{engine:"explanation-redundancy",severity:n>=6?"revise":"watch",message:"Interpretive/explanatory connectors are clustering. Check whether behavior, dialogue or physical evidence already lets the reader infer the meaning.",evidence:evidence(text,EXPLANATION_MARKERS),count:n}]:[];
}
function bodyDefaultDensity(text:string):AnnabelleDiagnostic[]{
  const n=countMatches(text,BODY_DEFAULTS);
  return n>=4?[{engine:"embodied-perspective",severity:n>=7?"revise":"watch",message:"Default body-response vocabulary is clustering. Expand propagation, mechanics and character-specific physical evidence rather than synonym swapping.",evidence:evidence(text,BODY_DEFAULTS),count:n}]:[];
}
function rhythmDensity(text:string):AnnabelleDiagnostic[]{
  const sentences=text.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
  if(sentences.length<20)return[];
  const fragments=sentences.filter(s=>s.split(/\s+/).length<=4).length;
  const ratio=fragments/sentences.length;
  return ratio>.35?[{engine:"rhythm",severity:ratio>.5?"revise":"watch",message:"Very-short sentence/fragment density is high. Confirm fragmentation is scene-earned rather than a manuscript-wide default rhythm.",evidence:[],count:fragments}]:[];
}

const WRITER_PERFORMANCE = /\b(the kind of|as if the (?:world|room|air|night)|something ancient|something primal|beautifully broken|deliciously|dangerously beautiful|perfectly imperfect)\b/gi;
const CAMERA_LEAK = /\b(unbeknownst to (?:her|him|them)|she couldn't see that|he couldn't see that|behind her, he|behind him, she)\b/gi;
const DISCOVERY_EXPLAIN = /\b(she realized|he realized|she understood|he understood|she knew then|he knew then|it dawned on)\b/gi;

function rawGravity(text:string):AnnabelleDiagnostic[]{
  const n=countMatches(text,WRITER_PERFORMANCE);
  return n>=2?[{engine:"raw-gravity",severity:n>=4?"revise":"watch",message:"Writer-performance language is clustering. Test each line against character/circumstance truth; do not keep a line merely because it sounds dramatic or beautiful.",evidence:evidence(text,WRITER_PERFORMANCE),count:n}]:[];
}
function cameraBoundary(text:string):AnnabelleDiagnostic[]{
  const n=countMatches(text,CAMERA_LEAK);
  return n?[{engine:"camera",severity:"watch",message:"Possible close-third camera leak. Confirm the focal character could perceive or infer this information in-scene.",evidence:evidence(text,CAMERA_LEAK),count:n}]:[];
}
function discoveryDensity(text:string):AnnabelleDiagnostic[]{
  const n=countMatches(text,DISCOVERY_EXPLAIN);
  return n>=4?[{engine:"discovery-density",severity:n>=7?"revise":"watch",message:"Explicit realization language is clustering. Let evidence accumulate before naming the inference where possible.",evidence:evidence(text,DISCOVERY_EXPLAIN),count:n}]:[];
}

function repeatedPhraseIntent(text:string):AnnabelleDiagnostic[]{
  const words=text.toLowerCase().replace(/[^a-z0-9' ]/g," ").split(/\s+/).filter(Boolean);
  const grams=new Map<string,number>();
  for(let n=3;n<=6;n++) for(let i=0;i<=words.length-n;i++){const g=words.slice(i,i+n).join(" ");grams.set(g,(grams.get(g)||0)+1);}
  const repeated=[...grams.entries()].filter(([g,n])=>n>=3 && g.length>14).sort((a,b)=>b[1]-a[1]).slice(0,5);
  return repeated.length?[{engine:"repetition-intent",severity:"watch",message:"Repeated multi-word language may be motif, character habit, trauma recurrence or accidental repetition. Classify intent before cutting.",evidence:repeated.map(([g,n])=>`${g} ×${n}`),count:repeated.length}]:[];
}
function sceneChange(text:string):AnnabelleDiagnostic[]{
  if(text.length<1800)return[];
  const action=/\b(decided|left|entered|opened|closed|called|told|asked|refused|agreed|learned|found|discovered|gave|took|returned|changed)\b/gi;
  const n=countMatches(text,action);
  return n<2?[{engine:"scene-change",severity:"note",message:"Long scene has few obvious state-change verbs. Verify that knowledge, relationship, body, threat, goal or choice is materially different at scene end.",evidence:[],count:n}]:[];
}

const TOUCH_GENERIC=/\b(electric(?:ity)?|spark(?:ed|s)?|tingle[ds]?|shiver(?:ed|ing)?|trembl(?:e|ed|ing)|breath hitch(?:ed)?)\b/gi;
const POWER_EXPLAIN=/\b(male fragility|fragile ego|he hated being corrected|he couldn't stand being wrong|loss of control|needed control)\b/gi;

function touchSpecificity(text:string):AnnabelleDiagnostic[]{
 const n=countMatches(text,TOUCH_GENERIC);
 return n>=4?[{engine:"touch",severity:n>=7?"revise":"watch",message:"Generic touch/arousal shorthand is clustering. Prefer contact geometry, pressure, duration, withdrawal, residue and character-specific response.",evidence:evidence(text,TOUCH_GENERIC),count:n}]:[];
}
function powerResponse(text:string):AnnabelleDiagnostic[]{
 const n=countMatches(text,POWER_EXPLAIN);
 return n>=2?[{engine:"power-response",severity:"watch",message:"Power/fragility is being named repeatedly. Prefer the bruise and the behavioral response: space-taking, deflection, blame transfer, status defense or escalation.",evidence:evidence(text,POWER_EXPLAIN),count:n}]:[];
}
function environmentPresence(text:string):AnnabelleDiagnostic[]{
 if(text.length<1600)return[];
 const environment=/\b(window|door|floor|wall|table|chair|street|traffic|light|shadow|air|room|hall|stairs|glass|rain|wind|heat|cold|sound|voice|footstep|fabric|metal|wood)\b/gi;
 const n=countMatches(text,environment);
 return n<4?[{engine:"object-environment",severity:"note",message:"Long passage has little environmental/object interaction. Check for empty-room dialogue; add only details the focal character would actually register.",evidence:[],count:n}]:[];
}
