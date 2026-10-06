export type CoverageDimension="document_family"|"date_bucket"|"entity"|"location"|"record_type";

export type CoverageBucketInput={
  dimension:CoverageDimension;
  key:string;
  expectedCount:number|null;
  observedUniqueSourceRefs:readonly string[];
  processedUniqueSourceRefs:readonly string[];
};

export type CoverageBucket={
  dimension:CoverageDimension;
  key:string;
  expectedCount:number|null;
  observedCount:number;
  processedCount:number;
  coverageRatio:number|null;
  missingObservedCount:number;
  status:"unmeasured"|"sparse"|"partial"|"substantial"|"complete_observed_set";
};

export type ResearchCoverageMap={
  buckets:readonly CoverageBucket[];
  blindSpots:readonly CoverageBucket[];
  status:"coverage_not_truth";
};

const req=(v:unknown,k:string,max=500):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_coverage_"+k);
  return v.trim();
};
const uniq=(v:readonly string[])=>[...new Set(v.map(x=>req(x,"source_ref",800)))].sort();

export function buildResearchCoverageMap(input:readonly CoverageBucketInput[]):ResearchCoverageMap{
  const buckets=input.map(bucket=>{
    if(!["document_family","date_bucket","entity","location","record_type"].includes(bucket.dimension))
      throw new Error("invalid_coverage_dimension");
    const key=req(bucket.key,"key");
    if(bucket.expectedCount!==null&&(!Number.isSafeInteger(bucket.expectedCount)||bucket.expectedCount<0))
      throw new Error("invalid_coverage_expected_count");
    const observed=uniq(bucket.observedUniqueSourceRefs);
    const processed=uniq(bucket.processedUniqueSourceRefs);
    if(processed.some(ref=>!observed.includes(ref)))throw new Error("coverage_processed_not_observed");
    const observedCount=observed.length,processedCount=processed.length;
    const denominator=bucket.expectedCount??(observedCount||null);
    const coverageRatio=denominator===null?null:denominator===0?1:Math.min(1,processedCount/denominator);
    let status:CoverageBucket["status"]="unmeasured";
    if(coverageRatio!==null){
      if(coverageRatio>=1&&processedCount===observedCount)status="complete_observed_set";
      else if(coverageRatio>=.75)status="substantial";
      else if(coverageRatio>=.25)status="partial";
      else status="sparse";
    }
    return {dimension:bucket.dimension,key,expectedCount:bucket.expectedCount,observedCount,processedCount,
      coverageRatio,missingObservedCount:observedCount-processedCount,status};
  });
  const blindSpots=buckets.filter(b=>b.status==="unmeasured"||b.status==="sparse"||b.missingObservedCount>0)
    .sort((a,b)=>(a.coverageRatio??-1)-(b.coverageRatio??-1)||b.missingObservedCount-a.missingObservedCount||
      a.dimension.localeCompare(b.dimension)||a.key.localeCompare(b.key));
  return {buckets:buckets.sort((a,b)=>a.dimension.localeCompare(b.dimension)||a.key.localeCompare(b.key)),
    blindSpots,status:"coverage_not_truth"};
}
