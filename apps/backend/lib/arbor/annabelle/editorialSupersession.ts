export type SupersessionRecord={
 id:string;
 supersedesId:string|null;
 epistemicStatus:"observed"|"confirmed"|"rejected";
 createdAt:string;
};
export function resolveEditorialSupersession<T extends SupersessionRecord>(rows:readonly T[]):T[]{
 const byId=new Map(rows.map(r=>[r.id,r]));const superseded=new Set<string>();
 for(const row of rows){if(row.supersedesId&&byId.has(row.supersedesId))superseded.add(row.supersedesId);}
 return rows.filter(r=>r.epistemicStatus!=="rejected"&&!superseded.has(r.id)).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)||a.id.localeCompare(b.id));
}
export function validateSupersessionGraph(rows:readonly SupersessionRecord[]):string[]{
 const errors:string[]=[];const byId=new Map<string,SupersessionRecord>();
 for(const row of rows){
  if(byId.has(row.id))errors.push(`duplicate-id:${row.id}`);
  byId.set(row.id,row);
  if(row.supersedesId===row.id)errors.push(`self-supersession:${row.id}`);
  if(Number.isNaN(Date.parse(row.createdAt)))errors.push(`invalid-created-at:${row.id}`);
 }
 for(const row of rows){
  if(row.supersedesId&&!byId.has(row.supersedesId))errors.push(`missing-parent:${row.id}->${row.supersedesId}`);
  if(row.supersedesId){
   const parent=byId.get(row.supersedesId);
   if(parent&&!Number.isNaN(Date.parse(parent.createdAt))&&!Number.isNaN(Date.parse(row.createdAt))&&Date.parse(row.createdAt)<Date.parse(parent.createdAt))
    errors.push(`time-inversion:${row.id}->${parent.id}`);
  }
  const seen=new Set<string>([row.id]);let cur=row;
  while(cur.supersedesId){
   if(seen.has(cur.supersedesId)){errors.push(`cycle:${row.id}`);break;}
   seen.add(cur.supersedesId);const next=byId.get(cur.supersedesId);if(!next)break;cur=next;
  }
 }
 return[...new Set(errors)];
}
