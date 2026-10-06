import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {parseConversationObject} from "./parseChatGPT";

/** Structural source review only: no database, embeddings, extraction or checkpoint writes. */
export async function preflightHistoricalSources(files:string[]) {
  const seen=new Map<string,string>();
  const reports=[];
  let duplicateTurns=0, conflictingTurns=0;
  for(const file of [...files].sort()) {
    const bytes=await fs.promises.readFile(file);
    // Validate the whole JSON before trusting counts; the legacy streaming
    // importer can skip malformed conversation objects while continuing.
    const conversations:unknown=JSON.parse(bytes.toString("utf8"));
    if(!Array.isArray(conversations))throw new Error("historical_preflight_expected_array");
    let emptyEntries=0, conversationsWithText=0, turns=0, messagesWithStructuredParts=0;
    const problems: {entry:number;code:string}[]=[];
    for(let index=0;index<conversations.length;index++) {
      const c=conversations[index];
      if(!c || typeof c!=="object" || Array.isArray(c)) {
        problems.push({entry:index,code:"invalid_conversation"});continue;
      }
      if(Object.keys(c).length===0){emptyEntries++;continue;}
      const id=c.conversation_id??c.id;
      if(typeof id!=="string" || !id){problems.push({entry:index,code:"missing_conversation_id"});continue;}
      const mapping=c.mapping;
      if(!mapping || typeof mapping!=="object" || Array.isArray(mapping) || typeof c.current_node!=="string" || !c.current_node || !Object.hasOwn(mapping,c.current_node)) {
        problems.push({entry:index,code:"missing_active_branch"});continue;
      }
      let cursor:string|null=c.current_node;
      const visited=new Set<string>();
      let invalid=false;
      while(cursor){
        if(visited.has(cursor)){problems.push({entry:index,code:"cyclic_branch"});invalid=true;break;}
        if(!Object.hasOwn(mapping,cursor) || !mapping[cursor]){problems.push({entry:index,code:"missing_parent"});invalid=true;break;}
        visited.add(cursor);
        const node=mapping[cursor];
        const parts=node.message?.content?.parts;
        if(["user","assistant"].includes(node.message?.author?.role) && Array.isArray(parts) && parts.some(p=>typeof p!=="string"))messagesWithStructuredParts++;
        const parent=node.parent;
        if(parent!=null && typeof parent!=="string"){problems.push({entry:index,code:"invalid_parent"});invalid=true;break;}
        cursor=parent??null;
      }
      if(invalid)continue;
      const parsed=parseConversationObject(c);
      if(parsed.length)conversationsWithText++;
      for(const turn of parsed){
        turns++;
        const key=JSON.stringify([turn.source,turn.sourceConversationId,turn.sourceMessageId]);
        const hash=createHash("sha256").update(JSON.stringify([turn.role,turn.content,turn.createdAt])).digest("hex");
        const previous=seen.get(key);
        if(previous===hash)duplicateTurns++;
        else if(previous){conflictingTurns++;problems.push({entry:index,code:"conflicting_source_message"});}
        else seen.set(key,hash);
      }
    }
    reports.push({file:path.basename(file),bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),
      entries:conversations.length,emptyEntries,conversationsWithText,turns,messagesWithStructuredParts,problems});
  }
  return {ready:reports.every(r=>r.problems.length===0),files:reports,uniqueTurns:seen.size,
    duplicateTurns,conflictingTurns,scope:"existing parser's normalized active-branch messages; structured parts may be serialized; media bytes and alternative branches are not read or imported",
    writes:false,modelCalls:false};
}
