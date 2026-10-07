export type CorpusFinding={phrase:string;count:number;classification:"review"|"likely-intentional"|"assembly-risk"};
const stop=new Set(["the","and","that","with","this","from","were","have","she","him","her","his","you","but","not"]);
export function corpusRepetition(text:string):CorpusFinding[]{
 const words=text.toLowerCase().replace(/[^a-z0-9' ]/g," ").split(/\s+/).filter(w=>w&&!stop.has(w));
 const grams=new Map<string,number>();
 for(let n=2;n<=7;n++)for(let i=0;i<=words.length-n;i++){const g=words.slice(i,i+n).join(" ");if(g.length<10)continue;grams.set(g,(grams.get(g)??0)+1);}
 return [...grams.entries()].filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]).slice(0,100).map(([phrase,count])=>({phrase,count,classification:count>=8?"assembly-risk":"review"}));
}
export type AtmosphereSignal={category:"sound"|"light"|"temperature"|"texture"|"weather"|"object"|"human-residue";evidence:string};
const patterns:Record<AtmosphereSignal["category"],RegExp>={
 sound:/\b(voice|footstep|music|traffic|hum|click|silence|laugh)\b/i,
 light:/\b(light|shadow|glow|dark|sun|lamp|neon)\b/i,
 temperature:/\b(cold|warm|heat|chill|hot|freezing)\b/i,
 texture:/\b(rough|smooth|wool|cotton|silk|grain|fabric|metal)\b/i,
 weather:/\b(rain|snow|wind|storm|fog|sunlight)\b/i,
 object:/\b(table|chair|door|window|glass|cup|coat|phone|keys)\b/i,
 "human-residue":/\b(fingerprint|smudge|crumb|dent|wrinkle|half-empty|forgotten|left behind)\b/i,
};
export function atmosphereCoverage(text:string):{present:AtmosphereSignal[];missing:AtmosphereSignal["category"][]}{
 const present=(Object.entries(patterns) as [AtmosphereSignal["category"],RegExp][]).flatMap(([category,re])=>{const m=text.match(re);return m?[{category,evidence:m[0]}]:[]});
 const set=new Set(present.map(x=>x.category));return{present,missing:(Object.keys(patterns) as AtmosphereSignal["category"][]).filter(x=>!set.has(x))};
}
