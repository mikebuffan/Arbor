export type ResolverDecisionReceipt={
  resolver:string;
  subjectRef:string;
  decision:string;
  evidenceRefs:readonly string[];
};

export type InvestigationReplayRecipe={
  recipeId:string;
  corpusSnapshotRefs:readonly string[];
  queryText:string;
  filters:Readonly<Record<string,string|number|boolean|null>>;
  hopDirectives:readonly string[];
  resolverDecisions:readonly ResolverDecisionReceipt[];
  codeVersion:string;
  algorithmVersions:Readonly<Record<string,string>>;
  producedEvidenceRefs:readonly string[];
  producedLeadRefs:readonly string[];
};

export type InvestigationReplayReceipt={
  recipe:InvestigationReplayRecipe;
  canonicalRecipeJson:string;
  recipeSha256:string;
  status:"replayable_recipe_not_finding";
};

const req=(v:unknown,k:string,max=20000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_replay_"+k);
  return v.trim();
};
const uniq=(v:readonly string[],k:string)=>[...new Set(v.map(x=>req(x,k,1000)))].sort();

function canonicalize(value:unknown):string{
  if(value===null||typeof value==="string"||typeof value==="boolean")return JSON.stringify(value);
  if(typeof value==="number"){
    if(!Number.isFinite(value))throw new Error("invalid_replay_nonfinite_number");
    return JSON.stringify(value);
  }
  if(Array.isArray(value))return "["+value.map(canonicalize).join(",")+"]";
  if(typeof value==="object"){
    const record=value as Record<string,unknown>;
    return "{"+Object.keys(record).sort().map(k=>JSON.stringify(k)+":"+canonicalize(record[k])).join(",")+"}";
  }
  throw new Error("invalid_replay_value");
}

function validateRecipe(input:InvestigationReplayRecipe):InvestigationReplayRecipe{
  const recipeId=req(input.recipeId,"recipe_id");
  const corpusSnapshotRefs=uniq(input.corpusSnapshotRefs,"corpus_snapshot_ref");
  if(!corpusSnapshotRefs.length)throw new Error("replay_snapshot_required");
  const queryText=req(input.queryText,"query_text");
  const hopDirectives=uniq(input.hopDirectives,"hop_directive");
  const codeVersion=req(input.codeVersion,"code_version",300);
  const producedEvidenceRefs=uniq(input.producedEvidenceRefs,"evidence_ref");
  const producedLeadRefs=uniq(input.producedLeadRefs,"lead_ref");

  const filters:Record<string,string|number|boolean|null>={};
  for(const key of Object.keys(input.filters).sort()){
    req(key,"filter_key",200);
    const value=input.filters[key];
    if(!(value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean"))
      throw new Error("invalid_replay_filter_value");
    if(typeof value==="number"&&!Number.isFinite(value))throw new Error("invalid_replay_filter_value");
    filters[key]=typeof value==="string"?req(value,"filter_value",3000):value;
  }

  const algorithmVersions:Record<string,string>={};
  for(const key of Object.keys(input.algorithmVersions).sort()){
    req(key,"algorithm_key",200);
    algorithmVersions[key]=req(input.algorithmVersions[key],"algorithm_version",300);
  }

  const resolverDecisions=input.resolverDecisions.map(r=>({
    resolver:req(r.resolver,"resolver",300),
    subjectRef:req(r.subjectRef,"resolver_subject",500),
    decision:req(r.decision,"resolver_decision",1000),
    evidenceRefs:uniq(r.evidenceRefs,"resolver_evidence_ref"),
  }));
  if(resolverDecisions.some(r=>!r.evidenceRefs.length))throw new Error("replay_resolver_evidence_required");

  return {recipeId,corpusSnapshotRefs,queryText,filters,hopDirectives,resolverDecisions,codeVersion,
    algorithmVersions,producedEvidenceRefs,producedLeadRefs};
}

async function digest(value:string):Promise<string>{
  const bytes=new TextEncoder().encode(value);
  const stable=new Uint8Array(bytes.byteLength);stable.set(bytes);
  const hash=await crypto.subtle.digest("SHA-256",stable.buffer);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function createInvestigationReplayReceipt(input:InvestigationReplayRecipe):Promise<InvestigationReplayReceipt>{
  const recipe=validateRecipe(input);
  const canonicalRecipeJson=canonicalize(recipe);
  return {recipe,canonicalRecipeJson,recipeSha256:await digest(canonicalRecipeJson),
    status:"replayable_recipe_not_finding"};
}

export async function verifyReplayRecipe(receipt:InvestigationReplayReceipt):Promise<boolean>{
  if(receipt.status!=="replayable_recipe_not_finding")return false;
  const valid=validateRecipe(receipt.recipe);
  const canonical=canonicalize(valid);
  return canonical===receipt.canonicalRecipeJson&&await digest(canonical)===receipt.recipeSha256;
}
