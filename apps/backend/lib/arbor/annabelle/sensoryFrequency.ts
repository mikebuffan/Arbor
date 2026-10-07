export type SensoryFrequencyRow={
 token:string;
 chapterCount:number;
 corpusCount:number;
 chapterWords:number;
 corpusWords:number;
};
export type SensoryFrequencyFinding={
 token:string;
 chapterRate:number;
 corpusRate:number;
 ratio:number;
 severity:"note"|"watch"|"revise";
 message:string;
};

export function compareSensoryFrequency(rows:readonly SensoryFrequencyRow[]):SensoryFrequencyFinding[]{
 return rows.flatMap(row=>{
  if(row.chapterCount<2||row.chapterWords<=0||row.corpusWords<=0)return[];
  const chapterRate=row.chapterCount/row.chapterWords;
  const corpusRate=row.corpusCount/row.corpusWords;
  const ratio=corpusRate>0?chapterRate/corpusRate:row.chapterCount>=4?Infinity:1;
  if(ratio<2&&row.chapterCount<4)return[];
  const severity=row.chapterCount>=6&&ratio>=3?"revise":row.chapterCount>=3&&ratio>=2?"watch":"note";
  return[{token:row.token,chapterRate,corpusRate,ratio,severity,message:`"${row.token}" is locally dense. Expand what is noticed before considering wording changes; this is not a ban.`}];
 });
}
