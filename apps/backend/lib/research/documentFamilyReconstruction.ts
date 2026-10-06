export type DocumentKind =
  | "email"|"attachment"|"message"|"calendar_event"|"travel_record"
  | "invoice"|"payment"|"ledger"|"deposition"|"exhibit"|"other";

export type DocumentFamilyNode={
  documentId:string;
  kind:DocumentKind;
  sourceRefs:readonly string[];
  messageId?:string|null;
  inReplyToMessageId?:string|null;
  attachmentOfDocumentId?:string|null;
  calendarEventId?:string|null;
  tripRef?:string|null;
  invoiceRef?:string|null;
  paymentRef?:string|null;
  exhibitOfDocumentId?:string|null;
};

export type DocumentFamilyEdgeType =
  | "reply_to"|"attachment_of"|"same_calendar_event"|"same_trip"
  | "invoice_payment"|"deposition_exhibit";

export type DocumentFamilyEdge={
  leftDocumentId:string;
  rightDocumentId:string;
  type:DocumentFamilyEdgeType;
  basis:string;
  sourceRefs:readonly string[];
  status:"explicit_or_deterministic_link";
};

export type DocumentFamily={
  familyId:string;
  documentIds:readonly string[];
  edges:readonly DocumentFamilyEdge[];
  status:"reconstructed_from_explicit_keys";
};

const txt=(v:unknown,k:string,max=500):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_family_"+k);
  return v.trim();
};
const opt=(v:string|null|undefined,k:string)=>v==null?null:txt(v,k);
const uniq=(a:readonly string[])=>[...new Set(a)].sort();
const pair=(a:string,b:string)=>a<b?[a,b] as const:[b,a] as const;

function validateNode(n:DocumentFamilyNode):DocumentFamilyNode{
  const documentId=txt(n.documentId,"document_id");
  if(!["email","attachment","message","calendar_event","travel_record","invoice","payment","ledger","deposition","exhibit","other"].includes(n.kind))
    throw new Error("invalid_family_document_kind");
  const sourceRefs=uniq(n.sourceRefs.map(x=>txt(x,"source_ref")));
  if(!sourceRefs.length)throw new Error("document_family_source_ref_required");
  return {...n,documentId,sourceRefs,
    messageId:opt(n.messageId,"message_id"),
    inReplyToMessageId:opt(n.inReplyToMessageId,"in_reply_to"),
    attachmentOfDocumentId:opt(n.attachmentOfDocumentId,"attachment_of"),
    calendarEventId:opt(n.calendarEventId,"calendar_event_id"),
    tripRef:opt(n.tripRef,"trip_ref"),
    invoiceRef:opt(n.invoiceRef,"invoice_ref"),
    paymentRef:opt(n.paymentRef,"payment_ref"),
    exhibitOfDocumentId:opt(n.exhibitOfDocumentId,"exhibit_of")};
}

export function reconstructDocumentFamilies(nodesInput:readonly DocumentFamilyNode[]):readonly DocumentFamily[]{
  const nodes=nodesInput.map(validateNode);
  if(new Set(nodes.map(n=>n.documentId)).size!==nodes.length)throw new Error("duplicate_family_document_id");
  const byId=new Map(nodes.map(n=>[n.documentId,n]));
  const byMessage=new Map(nodes.filter(n=>n.messageId).map(n=>[n.messageId!,n]));
  const edges:DocumentFamilyEdge[]=[];
  const seen=new Set<string>();

  const add=(a:DocumentFamilyNode,b:DocumentFamilyNode,type:DocumentFamilyEdgeType,basis:string)=>{
    if(a.documentId===b.documentId)return;
    const [left,right]=pair(a.documentId,b.documentId),key=[left,right,type].join("|");
    if(seen.has(key))return;seen.add(key);
    edges.push({leftDocumentId:left,rightDocumentId:right,type,basis,
      sourceRefs:uniq([...a.sourceRefs,...b.sourceRefs]),status:"explicit_or_deterministic_link"});
  };

  for(const n of nodes){
    if(n.inReplyToMessageId){
      const parent=byMessage.get(n.inReplyToMessageId);if(parent)add(n,parent,"reply_to","in_reply_to_message_id");
    }
    if(n.attachmentOfDocumentId){
      const parent=byId.get(n.attachmentOfDocumentId);if(parent)add(n,parent,"attachment_of","attachment_of_document_id");
    }
    if(n.exhibitOfDocumentId){
      const parent=byId.get(n.exhibitOfDocumentId);if(parent)add(n,parent,"deposition_exhibit","exhibit_of_document_id");
    }
  }
  const linkShared=(field:"calendarEventId"|"tripRef"|"invoiceRef"|"paymentRef",type:DocumentFamilyEdgeType,basis:string)=>{
    const groups=new Map<string,DocumentFamilyNode[]>();
    for(const n of nodes){
      const value=n[field];if(value)groups.set(value,[...(groups.get(value)??[]),n]);
    }
    for(const members of groups.values())for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++)add(members[i],members[j],type,basis);
  };
  linkShared("calendarEventId","same_calendar_event","shared_calendar_event_id");
  linkShared("tripRef","same_trip","shared_trip_ref");

  const invoices=nodes.filter(n=>n.kind==="invoice"&&n.invoiceRef);
  const payments=nodes.filter(n=>n.kind==="payment");
  for(const i of invoices)for(const p of payments){
    if((p.invoiceRef&&p.invoiceRef===i.invoiceRef)||(i.paymentRef&&p.paymentRef===i.paymentRef))
      add(i,p,"invoice_payment","explicit_invoice_or_payment_reference");
  }

  const parent=new Map(nodes.map(n=>[n.documentId,n.documentId]));
  const find=(id:string):string=>{let p=parent.get(id)!;while(parent.get(p)!==p)p=parent.get(p)!;return p;};
  const union=(a:string,b:string)=>{const A=find(a),B=find(b);if(A!==B)parent.set(B,A);};
  for(const e of edges)union(e.leftDocumentId,e.rightDocumentId);
  const groups=new Map<string,string[]>();
  for(const n of nodes){const root=find(n.documentId);groups.set(root,[...(groups.get(root)??[]),n.documentId]);}

  return [...groups.values()].map(ids=>{
    const sorted=ids.sort();
    const edgeSet=edges.filter(e=>sorted.includes(e.leftDocumentId)&&sorted.includes(e.rightDocumentId))
      .sort((a,b)=>a.type.localeCompare(b.type)||a.leftDocumentId.localeCompare(b.leftDocumentId)||a.rightDocumentId.localeCompare(b.rightDocumentId));
    return {familyId:"family:"+sorted.join("|"),documentIds:sorted,edges:edgeSet,
      status:"reconstructed_from_explicit_keys" as const};
  }).sort((a,b)=>a.familyId.localeCompare(b.familyId));
}
