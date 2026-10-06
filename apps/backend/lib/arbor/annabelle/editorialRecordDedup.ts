export type EditorialRecordIdentity={manuscriptId:string;chapterNumber:number|null;recordType:string;subject:string;sourceSha256:string;sourceLocator:string};
export function editorialRecordKey(x:EditorialRecordIdentity):string{
 return [x.manuscriptId,x.chapterNumber??"global",x.recordType,x.subject,x.sourceSha256,x.sourceLocator].join("|");
}
export function dedupeEditorialRecords<T extends EditorialRecordIdentity>(rows:readonly T[]):{unique:T[];duplicateKeys:string[]}{
 const seen=new Set<string>();const unique:T[]=[];const duplicateKeys:string[]=[];
 for(const row of rows){const key=editorialRecordKey(row);if(seen.has(key)){duplicateKeys.push(key);continue;}seen.add(key);unique.push(row);}
 return{unique,duplicateKeys:[...new Set(duplicateKeys)]};
}
