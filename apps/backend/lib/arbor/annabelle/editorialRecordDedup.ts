export type EditorialRecordIdentity={
 manuscriptId:string;
 chapterNumber:number|null;
 recordType:string;
 subject:string;
 sourceSha256:string;
 sourceLocator:unknown;
};

function stable(value:unknown):string{
 if(value===null||typeof value!=="object")return JSON.stringify(value);
 if(Array.isArray(value))return `[${value.map(stable).join(",")}]`;
 const obj=value as Record<string,unknown>;
 return `{${Object.keys(obj).sort().map(k=>`${JSON.stringify(k)}:${stable(obj[k])}`).join(",")}}`;
}

export function editorialRecordKey(x:EditorialRecordIdentity):string{
 return [x.manuscriptId,x.chapterNumber??"global",x.recordType,x.subject,x.sourceSha256,stable(x.sourceLocator)].join("|");
}
export function dedupeEditorialRecords<T extends EditorialRecordIdentity>(rows:readonly T[]):{unique:T[];duplicateKeys:string[]}{
 const seen=new Set<string>();const unique:T[]=[];const duplicateKeys:string[]=[];
 for(const row of rows){const key=editorialRecordKey(row);if(seen.has(key)){duplicateKeys.push(key);continue;}seen.add(key);unique.push(row);}
 return{unique,duplicateKeys:[...new Set(duplicateKeys)]};
}
