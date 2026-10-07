export type ProtectedSpan={text:string;sourceSha256:string;kind:"gold"|"do-not-touch";reason?:string};
export type ProtectedEditResult={allowed:boolean;violations:string[]};
export function protectGoldEdits(input:{before:string;after:string;protectedSpans:readonly ProtectedSpan[];explicitOverride?:boolean}):ProtectedEditResult{
 if(input.explicitOverride)return{allowed:true,violations:[]};
 const violations=input.protectedSpans.filter(span=>input.before.includes(span.text)&&!input.after.includes(span.text)).map(span=>`${span.kind} span removed: ${span.text.slice(0,80)}`);
 return{allowed:violations.length===0,violations};
}
