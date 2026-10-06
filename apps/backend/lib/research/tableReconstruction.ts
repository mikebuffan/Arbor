export type TableToken={
  tokenId:string;
  text:string;
  sourceRef:string;
  pageHash:string;
  x:number;y:number;width:number;height:number;
  confidence:number|null;
};
export type TableCell={
  rowIndex:number;columnIndex:number;
  text:string;
  tokenIds:readonly string[];
  sourceRefs:readonly string[];
  box:{x:number;y:number;width:number;height:number};
};
export type ReconstructedTable={
  rowCount:number;
  columnCount:number;
  cells:readonly TableCell[];
  rowCenters:readonly number[];
  columnCenters:readonly number[];
  status:"candidate_requires_visual_review";
};

const t=(v:unknown,k:string,max=4000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_table_"+k);
  return v.trim();
};
function validToken(token:TableToken):TableToken{
  const tokenId=t(token.tokenId,"token_id"),text=t(token.text,"token_text"),sourceRef=t(token.sourceRef,"source_ref");
  const pageHash=t(token.pageHash,"page_hash").toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(pageHash))throw new Error("invalid_table_page_hash");
  if(![token.x,token.y,token.width,token.height].every(Number.isFinite)||
     token.x<0||token.y<0||token.width<=0||token.height<=0)throw new Error("invalid_table_box");
  if(token.confidence!==null&&(!Number.isFinite(token.confidence)||token.confidence<0||token.confidence>1))
    throw new Error("invalid_table_confidence");
  return {...token,tokenId,text,sourceRef,pageHash};
}
function cluster(values:readonly number[],tolerance:number):number[]{
  const sorted=[...values].sort((a,b)=>a-b);
  const centers:number[]=[];
  for(const value of sorted){
    const i=centers.findIndex(c=>Math.abs(c-value)<=tolerance);
    if(i<0)centers.push(value);
    else centers[i]=(centers[i]+value)/2;
  }
  return centers.sort((a,b)=>a-b);
}
function nearest(value:number,centers:readonly number[]):number{
  let best=0,d=Infinity;
  centers.forEach((c,i)=>{const n=Math.abs(c-value);if(n<d){d=n;best=i;}});
  return best;
}
function unionBox(tokens:readonly TableToken[]){
  const x=Math.min(...tokens.map(v=>v.x)),y=Math.min(...tokens.map(v=>v.y));
  const r=Math.max(...tokens.map(v=>v.x+v.width)),b=Math.max(...tokens.map(v=>v.y+v.height));
  return {x,y,width:r-x,height:b-y};
}

/**
 * Deterministic geometric reconstruction only. It groups tokens into visual
 * rows/columns; it does not infer headers, totals, account ownership, or meaning.
 */
export function reconstructTable(input:{
  tokens:readonly TableToken[];
  rowTolerancePx:number;
  columnTolerancePx:number;
}):ReconstructedTable{
  if(!Number.isFinite(input.rowTolerancePx)||input.rowTolerancePx<=0||input.rowTolerancePx>200||
     !Number.isFinite(input.columnTolerancePx)||input.columnTolerancePx<=0||input.columnTolerancePx>500)
    throw new Error("invalid_table_tolerance");
  if(!Array.isArray(input.tokens)||!input.tokens.length||input.tokens.length>50000)
    throw new Error("invalid_table_tokens");
  const tokens=input.tokens.map(validToken);
  if(new Set(tokens.map(x=>x.tokenId)).size!==tokens.length)throw new Error("duplicate_table_token_id");
  if(new Set(tokens.map(x=>x.pageHash)).size!==1)throw new Error("table_tokens_must_share_page");

  const rowCenters=cluster(tokens.map(v=>v.y+v.height/2),input.rowTolerancePx);
  const columnCenters=cluster(tokens.map(v=>v.x+v.width/2),input.columnTolerancePx);
  const groups=new Map<string,TableToken[]>();
  for(const token of tokens){
    const row=nearest(token.y+token.height/2,rowCenters),col=nearest(token.x+token.width/2,columnCenters);
    const key=row+":"+col;groups.set(key,[...(groups.get(key)??[]),token]);
  }
  const cells=[...groups.entries()].map(([key,members])=>{
    const [rowIndex,columnIndex]=key.split(":").map(Number);
    const sorted=members.sort((a,b)=>a.x-b.x||a.y-b.y);
    return {rowIndex,columnIndex,text:sorted.map(v=>v.text).join(" "),
      tokenIds:sorted.map(v=>v.tokenId),sourceRefs:[...new Set(sorted.map(v=>v.sourceRef))].sort(),
      box:unionBox(sorted)};
  }).sort((a,b)=>a.rowIndex-b.rowIndex||a.columnIndex-b.columnIndex);

  return {rowCount:rowCenters.length,columnCount:columnCenters.length,cells,rowCenters,columnCenters,
    status:"candidate_requires_visual_review"};
}

export function tableRowObjects(table:ReconstructedTable):readonly Record<string,string>[]{
  return Array.from({length:table.rowCount},(_,row)=>{
    const out:Record<string,string>={};
    for(let col=0;col<table.columnCount;col++){
      out["column_"+col]=table.cells.find(c=>c.rowIndex===row&&c.columnIndex===col)?.text??"";
    }
    return out;
  });
}
