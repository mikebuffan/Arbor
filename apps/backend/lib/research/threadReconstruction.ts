export type ThreadDocument = {
  documentId:string;
  messageId:string;
  sentAtUtc:string|null;
  senderEntityId:string|null;
  recipientEntityIds:readonly string[];
  inReplyToMessageId:string|null;
  forwardedMessageIds:readonly string[];
  sourceRefs:readonly string[];
};

export type ThreadEdgeType="reply_to"|"forwards";
export type ThreadEdge={
  fromDocumentId:string;
  toDocumentId:string;
  type:ThreadEdgeType;
  basis:string;
  sourceRefs:readonly string[];
};

export type ReconstructedThread={
  threadId:string;
  documentIds:readonly string[];
  edges:readonly ThreadEdge[];
  orphanReferenceIds:readonly string[];
  orderedDocumentIds:readonly string[];
  status:"reconstructed_from_explicit_message_keys";
};

const req=(v:unknown,k:string,max=500):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_thread_"+k);
  return v.trim();
};
const utc=(v:string|null):string|null=>{
  if(v===null)return null;
  const x=req(v,"sent_at");
  if(!Number.isFinite(Date.parse(x)))throw new Error("invalid_thread_sent_at");
  return x;
};
const uniq=(v:readonly string[],k:string)=>[...new Set(v.map(x=>req(x,k)))].sort();

export function reconstructThreads(input:readonly ThreadDocument[]):readonly ReconstructedThread[]{
  const docs=input.map(d=>({
    ...d,
    documentId:req(d.documentId,"document_id"),
    messageId:req(d.messageId,"message_id"),
    sentAtUtc:utc(d.sentAtUtc),
    senderEntityId:d.senderEntityId===null?null:req(d.senderEntityId,"sender_entity_id"),
    recipientEntityIds:uniq(d.recipientEntityIds,"recipient_entity_id"),
    inReplyToMessageId:d.inReplyToMessageId===null?null:req(d.inReplyToMessageId,"in_reply_to"),
    forwardedMessageIds:uniq(d.forwardedMessageIds,"forwarded_message_id"),
    sourceRefs:uniq(d.sourceRefs,"source_ref"),
  }));
  if(new Set(docs.map(d=>d.documentId)).size!==docs.length)throw new Error("duplicate_thread_document_id");
  if(new Set(docs.map(d=>d.messageId)).size!==docs.length)throw new Error("duplicate_thread_message_id");
  if(docs.some(d=>!d.sourceRefs.length))throw new Error("thread_source_ref_required");

  const byMessage=new Map(docs.map(d=>[d.messageId,d]));
  const parent=new Map(docs.map(d=>[d.documentId,d.documentId]));
  const find=(id:string):string=>{
    let p=parent.get(id)!;
    while(parent.get(p)!==p)p=parent.get(p)!;
    return p;
  };
  const union=(a:string,b:string)=>{const A=find(a),B=find(b);if(A!==B)parent.set(B,A);};
  const edges:ThreadEdge[]=[];
  const orphanByDoc=new Map<string,string[]>();

  const addOrphan=(docId:string,ref:string)=>{
    orphanByDoc.set(docId,[...(orphanByDoc.get(docId)??[]),ref]);
  };
  for(const doc of docs){
    if(doc.inReplyToMessageId){
      const target=byMessage.get(doc.inReplyToMessageId);
      if(target){
        union(doc.documentId,target.documentId);
        edges.push({fromDocumentId:doc.documentId,toDocumentId:target.documentId,type:"reply_to",
          basis:"in_reply_to_message_id",sourceRefs:uniq([...doc.sourceRefs,...target.sourceRefs],"source_ref")});
      } else addOrphan(doc.documentId,doc.inReplyToMessageId);
    }
    for(const forwardedId of doc.forwardedMessageIds){
      const target=byMessage.get(forwardedId);
      if(target){
        union(doc.documentId,target.documentId);
        edges.push({fromDocumentId:doc.documentId,toDocumentId:target.documentId,type:"forwards",
          basis:"explicit_forwarded_message_id",sourceRefs:uniq([...doc.sourceRefs,...target.sourceRefs],"source_ref")});
      } else addOrphan(doc.documentId,forwardedId);
    }
  }

  const groups=new Map<string,ThreadDocument[]>();
  for(const doc of docs){const root=find(doc.documentId);groups.set(root,[...(groups.get(root)??[]),doc]);}

  return [...groups.values()].map(members=>{
    const ids=members.map(m=>m.documentId).sort();
    const memberEdges=edges.filter(e=>ids.includes(e.fromDocumentId)&&ids.includes(e.toDocumentId))
      .sort((a,b)=>a.fromDocumentId.localeCompare(b.fromDocumentId)||a.toDocumentId.localeCompare(b.toDocumentId));
    const orphanReferenceIds=uniq(ids.flatMap(id=>orphanByDoc.get(id)??[]),"orphan_reference_id");
    const ordered=[...members].sort((a,b)=>{
      if(a.sentAtUtc===null&&b.sentAtUtc===null)return a.documentId.localeCompare(b.documentId);
      if(a.sentAtUtc===null)return 1;if(b.sentAtUtc===null)return -1;
      return Date.parse(a.sentAtUtc)-Date.parse(b.sentAtUtc)||a.documentId.localeCompare(b.documentId);
    }).map(d=>d.documentId);
    return {threadId:"thread:"+ids.join("|"),documentIds:ids,edges:memberEdges,orphanReferenceIds,
      orderedDocumentIds:ordered,status:"reconstructed_from_explicit_message_keys" as const};
  }).sort((a,b)=>a.threadId.localeCompare(b.threadId));
}
