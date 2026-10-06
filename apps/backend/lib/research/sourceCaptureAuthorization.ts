export type PublicSourceCaptureAuthorization={
  authorizationId:string;
  sourceUri:string;
  expectedHost:string;
  sourceAuthority:string;
  sourceClass:"official_government"|"court_record"|"legislative_release"|"other_public_record";
  maxBytes:number;
  maxPages:number;
  maxWallClockMs:number;
  allowRedirectsToHosts:readonly string[];
  authorizedByHuman:true;
  authorizationRef:string;
  status:"authorized_candidate_not_fetched";
};

const req=(v:unknown,k:string,max=4000):string=>{
  if(typeof v!=="string"||!v.trim()||v.length>max)throw new Error("invalid_capture_"+k);
  return v.trim();
};
function host(value:string):string{
  const h=req(value,"host",253).toLowerCase();
  if(!/^[a-z0-9.-]+$/.test(h)||h.startsWith(".")||h.endsWith("."))throw new Error("invalid_capture_host");
  return h;
}

export function authorizePublicSourceCapture(input:PublicSourceCaptureAuthorization):PublicSourceCaptureAuthorization{
  const authorizationId=req(input.authorizationId,"authorization_id",300);
  const sourceAuthority=req(input.sourceAuthority,"source_authority",500);
  const authorizationRef=req(input.authorizationRef,"authorization_ref",1000);
  if(input.authorizedByHuman!==true)throw new Error("capture_human_authorization_required");
  if(!["official_government","court_record","legislative_release","other_public_record"].includes(input.sourceClass))
    throw new Error("invalid_capture_source_class");

  let url:URL;
  try{url=new URL(req(input.sourceUri,"source_uri",4000));}catch{throw new Error("invalid_capture_source_uri");}
  if(url.protocol!=="https:"||url.username||url.password)throw new Error("capture_https_public_uri_required");
  const expectedHost=host(input.expectedHost);
  if(url.hostname.toLowerCase()!==expectedHost)throw new Error("capture_host_mismatch");

  if(!Number.isSafeInteger(input.maxBytes)||input.maxBytes<1||input.maxBytes>100*1024*1024)
    throw new Error("invalid_capture_max_bytes");
  if(!Number.isSafeInteger(input.maxPages)||input.maxPages<1||input.maxPages>10000)
    throw new Error("invalid_capture_max_pages");
  if(!Number.isSafeInteger(input.maxWallClockMs)||input.maxWallClockMs<1000||input.maxWallClockMs>10*60*1000)
    throw new Error("invalid_capture_max_wall_clock");

  const allowRedirectsToHosts=[...new Set(input.allowRedirectsToHosts.map(host))].sort();
  if(!allowRedirectsToHosts.includes(expectedHost))throw new Error("capture_redirect_policy_must_include_origin");

  return {authorizationId,sourceUri:url.toString(),expectedHost,sourceAuthority,sourceClass:input.sourceClass,
    maxBytes:input.maxBytes,maxPages:input.maxPages,maxWallClockMs:input.maxWallClockMs,
    allowRedirectsToHosts,authorizedByHuman:true,authorizationRef,status:"authorized_candidate_not_fetched"};
}

export type PublicSourceCapturePlan={
  authorizationId:string;
  sourceUri:string;
  requestMethod:"GET";
  maxBytes:number;
  maxPages:number;
  maxWallClockMs:number;
  redirectHosts:readonly string[];
  followRedirectLimit:3;
  executionRequested:false;
  status:"plan_ready_not_executed";
};

export function planAuthorizedCapture(authInput:PublicSourceCaptureAuthorization):PublicSourceCapturePlan{
  const auth=authorizePublicSourceCapture(authInput);
  return {authorizationId:auth.authorizationId,sourceUri:auth.sourceUri,requestMethod:"GET",
    maxBytes:auth.maxBytes,maxPages:auth.maxPages,maxWallClockMs:auth.maxWallClockMs,
    redirectHosts:auth.allowRedirectsToHosts,followRedirectLimit:3,executionRequested:false,
    status:"plan_ready_not_executed"};
}
