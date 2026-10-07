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
 const errors:string[]=[];const byId=new Map(rows.map(r=>[r.id,r]));
 for(const row of rows){const seen=new Set<string>([row.id]);let cur=row;while(cur.supersedesId){if(seen.has(cur.supersedesId)){errors.push(`cycle:${row.id}`);break;}seen.add(cur.supersedesId);const next=byId.get(cur.supersedesId);if(!next)break;cur=next;}}
 return[...new Set(errors)];
}
