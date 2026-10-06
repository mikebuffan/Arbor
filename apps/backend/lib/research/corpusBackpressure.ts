export type CorpusShardPlan={
  shardIndex:number;
  firstPage:number;
  lastPage:number;
  pageCount:number;
};
export type BackpressureDecision={
  action:"increase"|"hold"|"decrease"|"pause";
  nextConcurrency:number;
  nextBatchPages:number;
  reasons:readonly string[];
};
export function planCorpusShards(totalPages:number,maxPagesPerShard=5000):readonly CorpusShardPlan[]{
  if(!Number.isSafeInteger(totalPages)||totalPages<1||totalPages>100_000_000)throw new Error("invalid_corpus_page_count");
  if(!Number.isSafeInteger(maxPagesPerShard)||maxPagesPerShard<1||maxPagesPerShard>50_000)throw new Error("invalid_corpus_shard_size");
  const out:CorpusShardPlan[]=[];
  for(let first=1,i=0;first<=totalPages;first+=maxPagesPerShard,i++){
    const last=Math.min(totalPages,first+maxPagesPerShard-1);
    out.push({shardIndex:i,firstPage:first,lastPage:last,pageCount:last-first+1});
  }
  return out;
}
export function decideBackpressure(input:{
  currentConcurrency:number;
  currentBatchPages:number;
  maxConcurrency:number;
  maxBatchPages:number;
  queueDepth:number;
  p95LatencyMs:number;
  errorRate:number;
  memoryUtilization:number;
  storageBudgetRemainingRatio:number;
}):BackpressureDecision{
  const ints=[input.currentConcurrency,input.currentBatchPages,input.maxConcurrency,input.maxBatchPages,input.queueDepth];
  if(ints.some(x=>!Number.isSafeInteger(x)||x<0))throw new Error("invalid_backpressure_integer");
  if(input.currentConcurrency<1||input.maxConcurrency<input.currentConcurrency||
     input.currentBatchPages<1||input.maxBatchPages<input.currentBatchPages)throw new Error("invalid_backpressure_caps");
  for(const [v,k] of [[input.errorRate,"error_rate"],[input.memoryUtilization,"memory_utilization"],[input.storageBudgetRemainingRatio,"storage_budget"]] as const)
    if(!Number.isFinite(v)||v<0||v>1)throw new Error("invalid_backpressure_"+k);
  if(!Number.isFinite(input.p95LatencyMs)||input.p95LatencyMs<0)throw new Error("invalid_backpressure_latency");

  const reasons:string[]=[];
  let action:BackpressureDecision["action"]="hold";
  if(input.storageBudgetRemainingRatio<.05){
    action="pause";reasons.push("storage_budget_near_exhaustion");
  }else if(input.errorRate>.08||input.memoryUtilization>.9||input.p95LatencyMs>20_000){
    action="decrease";
    if(input.errorRate>.08)reasons.push("high_error_rate");
    if(input.memoryUtilization>.9)reasons.push("high_memory_utilization");
    if(input.p95LatencyMs>20_000)reasons.push("high_latency");
  }else if(input.queueDepth>input.currentConcurrency*4&&input.errorRate<.02&&input.memoryUtilization<.7&&input.p95LatencyMs<5000){
    action="increase";reasons.push("healthy_capacity_with_backlog");
  }else reasons.push("within_operating_band");

  if(action==="pause")return {action,nextConcurrency:0,nextBatchPages:input.currentBatchPages,reasons};
  if(action==="decrease")return {action,nextConcurrency:Math.max(1,Math.floor(input.currentConcurrency/2)),
    nextBatchPages:Math.max(1,Math.floor(input.currentBatchPages/2)),reasons};
  if(action==="increase")return {action,nextConcurrency:Math.min(input.maxConcurrency,input.currentConcurrency+1),
    nextBatchPages:Math.min(input.maxBatchPages,Math.ceil(input.currentBatchPages*1.25)),reasons};
  return {action,nextConcurrency:input.currentConcurrency,nextBatchPages:input.currentBatchPages,reasons};
}
