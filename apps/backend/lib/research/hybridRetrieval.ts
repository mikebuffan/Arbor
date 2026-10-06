export type RetrievalDocument={
  recordId:string;
  text:string;
  identifiers:readonly string[];
  sourceRefs:readonly string[];
  embedding?:readonly number[];
};
export type RetrievalQuery={
  text:string;
  identifiers?:readonly string[];
  embedding?:readonly number[];
};
export type RetrievalHit={
  recordId:string;
  score:number;
  exactIdentifierScore:number;
  lexicalScore:number;
  semanticScore:number|null;
  sourceRefs:readonly string[];
  reasons:readonly string[];
};

const norm=(s:string)=>s.normalize("NFKC").toLowerCase();
const toks=(s:string)=>norm(s).match(/[a-z0-9]{2,}/g)??[];
const req=(v:unknown,k:string,max=200000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_retrieval_"+k);
  return v.trim();
};
function cosine(a:readonly number[],b:readonly number[]):number{
  if(a.length!==b.length||!a.length)throw new Error("retrieval_embedding_dimension_mismatch");
  let dot=0,aa=0,bb=0;
  for(let i=0;i<a.length;i++){
    if(!Number.isFinite(a[i])||!Number.isFinite(b[i]))throw new Error("invalid_retrieval_embedding");
    dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];
  }
  return aa&&bb?Math.max(-1,Math.min(1,dot/Math.sqrt(aa*bb))):0;
}
function lexicalScore(query:string,doc:string,df:Map<string,number>,N:number):number{
  const q=toks(query),d=toks(doc);if(!q.length||!d.length)return 0;
  const tf=new Map<string,number>();for(const x of d)tf.set(x,(tf.get(x)??0)+1);
  let score=0;
  for(const term of new Set(q)){
    const freq=tf.get(term)??0;if(!freq)continue;
    const idf=Math.log(1+(N-(df.get(term)??0)+0.5)/((df.get(term)??0)+0.5));
    score+=idf*(freq/(freq+1.2));
  }
  return score;
}

/**
 * Ranking only. A hit is never promoted to evidence; callers must inspect the
 * anchored sourceRefs. Semantic scoring is used only when embeddings are already
 * supplied by an independently authorized embedding process.
 */
export function hybridRetrieve(input:{
  query:RetrievalQuery;
  documents:readonly RetrievalDocument[];
  limit?:number;
  weights?:{exact:number;lexical:number;semantic:number};
}):readonly RetrievalHit[]{
  const queryText=req(input.query.text,"query",20000);
  if(!Array.isArray(input.documents)||input.documents.length>50000)throw new Error("invalid_retrieval_documents");
  const limit=input.limit??20;
  if(!Number.isSafeInteger(limit)||limit<1||limit>200)throw new Error("invalid_retrieval_limit");
  const w=input.weights??{exact:.45,lexical:.35,semantic:.20};
  if(![w.exact,w.lexical,w.semantic].every(x=>Number.isFinite(x)&&x>=0)||w.exact+w.lexical+w.semantic<=0)
    throw new Error("invalid_retrieval_weights");

  const docs=input.documents.map((d:RetrievalDocument)=>({
    recordId:req(d.recordId,"record_id",240),text:req(d.text,"document_text"),
    identifiers:[...new Set(d.identifiers.map((x:string)=>req(x,"identifier",240)))],
    sourceRefs:[...new Set(d.sourceRefs.map((x:string)=>req(x,"source_ref",500)))],
    embedding:d.embedding,
  }));
  if(new Set(docs.map(d=>d.recordId)).size!==docs.length)throw new Error("duplicate_retrieval_record_id");
  if(docs.some(d=>!d.sourceRefs.length))throw new Error("retrieval_source_ref_required");

  const df=new Map<string,number>();
  for(const d of docs)for(const term of new Set(toks(d.text)))df.set(term,(df.get(term)??0)+1);
  const lexicalRaw=docs.map(d=>lexicalScore(queryText,d.text,df,docs.length));
  const lexicalMax=Math.max(0,...lexicalRaw);
  const qIds=new Set((input.query.identifiers??[]).map((x:string)=>norm(x)));

  return docs.map((d,i)=>{
    const dIds=new Set(d.identifiers.map((x:string)=>norm(x)));
    const overlap=[...qIds].filter(x=>dIds.has(x));
    const exact=qIds.size?overlap.length/qIds.size:0;
    let semantic:number|null=null;
    if(input.query.embedding&&d.embedding)semantic=(cosine(input.query.embedding,d.embedding)+1)/2;
    const lex=lexicalMax?lexicalRaw[i]/lexicalMax:0;
    const semanticContribution=semantic??0;
    const denom=w.exact+w.lexical+(semantic===null?0:w.semantic);
    const score=denom?(w.exact*exact+w.lexical*lex+(semantic===null?0:w.semantic*semanticContribution))/denom:0;
    const reasons:string[]=[];
    if(exact>0)reasons.push("exact_identifier_overlap");
    if(lex>0)reasons.push("lexical_match");
    if(semantic!==null)reasons.push("precomputed_semantic_similarity");
    return {recordId:d.recordId,score,exactIdentifierScore:exact,lexicalScore:lex,semanticScore:semantic,
      sourceRefs:d.sourceRefs,reasons};
  }).filter(h=>h.score>0).sort((a,b)=>b.score-a.score||a.recordId.localeCompare(b.recordId)).slice(0,limit);
}
