import { compareOriginalSources, originalSourceIdentity, type OriginalSourceIdentity } from './sourceVersion';

/** Pure canonical content grouping, not durable persistence or authorization.
 * Same original bytes share a content key across URLs/projects; access to
 * project-scoped aliases must be separately authorized by the caller.
 */
export type ScopedSourceAlias = {
  ownerId: string;
  projectId: string;
  localRecordId: string;
  identity: OriginalSourceIdentity;
};
export type CanonicalContentGroup = {
  contentVersionKey: string;
  aliases: readonly { ownerId:string; projectId:string; localRecordId:string; sourceVersionKey:string }[];
};
const required=(value:unknown,field:string):string=>{
 if(typeof value!=='string'||!value.trim()) throw new Error(`invalid_${field}`);
 return value.trim();
};
export function canonicalContentIndex(records: readonly ScopedSourceAlias[]): readonly CanonicalContentGroup[] {
 if(!Array.isArray(records)) throw new Error('invalid_source_records');
 const groups=new Map<string,CanonicalContentGroup['aliases'][number][]>();
 const identities=new Map<string,OriginalSourceIdentity>();
 const scopedIds=new Set<string>();
 for(const record of records){
  const ownerId=required(record.ownerId,'owner_id');
  const projectId=required(record.projectId,'project_id');
  const localRecordId=required(record.localRecordId,'local_record_id');
  const scope=JSON.stringify([ownerId,projectId,localRecordId]);
  if(scopedIds.has(scope))throw new Error('duplicate_scoped_source_record');
  scopedIds.add(scope);
  const identity=originalSourceIdentity({
   documentId:record.identity.documentId,sourceUri:record.identity.sourceUri,
   originalBytesSha256:record.identity.originalBytesSha256,
   originalByteLength:record.identity.originalByteLength,
   declaredPageCount:record.identity.physicalPdfPageCount,
  });
  const prior=identities.get(identity.contentVersionKey);
  if(prior)compareOriginalSources(prior,identity);
  else identities.set(identity.contentVersionKey,identity);
  const aliases=groups.get(identity.contentVersionKey)??[];
  aliases.push({ownerId,projectId,localRecordId,sourceVersionKey:identity.sourceVersionKey});
  groups.set(identity.contentVersionKey,aliases);
 }
 return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([contentVersionKey,aliases])=>({
  contentVersionKey,aliases:aliases.sort((a,b)=>JSON.stringify([a.ownerId,a.projectId,a.localRecordId]).localeCompare(
   JSON.stringify([b.ownerId,b.projectId,b.localRecordId]))),
 }));
}
/** Return only aliases for the trusted, explicit owner/project scope. */
export function scopedCanonicalAliases(groups:readonly CanonicalContentGroup[],ownerId:string,projectId:string){
 const owner=required(ownerId,'owner_id'),project=required(projectId,'project_id');
 return groups.flatMap(group=>group.aliases.filter(alias=>alias.ownerId===owner&&alias.projectId===project)
  .map(alias=>({contentVersionKey:group.contentVersionKey,localRecordId:alias.localRecordId,
   sourceVersionKey:alias.sourceVersionKey})));
}
