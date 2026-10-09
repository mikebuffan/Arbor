import { describe, expect, it, vi } from "vitest";
import { getEpisodeRecall } from "../episodeRecall";

const userId="synthetic-user";
const projectId="synthetic-project";
const original=(id: string, overrides: Record<string, unknown>={})=>({
  id,user_id:userId,project_id:projectId,thread_id:"thread-"+id,
  summary_json:{topics:["Archive recovery"],user_goals:["Finish continuity"],assistant_commitments:[],followups:[]},
  closed_at:"2026-10-08T12:00:00Z",updated_at:"2026-10-08T12:00:00Z",...overrides,
});
function database(rows: unknown) {
  const filters: Array<[string,unknown]> = [];
  const q: any={};
  q.select=vi.fn(()=>q);
  q.eq=(k:string,v:unknown)=>{filters.push([k,v]);return q;};
  q.not=q.order=()=>q;
  q.limit=vi.fn(async()=>({data:rows,error:null}));
  const from=vi.fn(()=>q);
  return {supabase:{from} as never,filters,from};
}
const input={userId,projectId,userText:"Archive recovery"};

describe("episode recall owner/project boundary",()=>{
  it("keeps only returned episodes belonging to the requested owner and project",async()=>{
    const db=database([
      original("safe"),
      original("foreign-owner",{user_id:"other-owner",summary_json:{topics:["SECRET-FOREIGN-OWNER"]}}),
      original("foreign-project",{project_id:"other-project",summary_json:{topics:["SECRET-FOREIGN-PROJECT"]}}),
      original("missing-owner",{user_id:null,summary_json:{topics:["SECRET-NO-OWNER"]}}),
    ]);
    const result=await getEpisodeRecall({...input,supabase:db.supabase});
    expect(result.map(item=>item.id)).toEqual(["safe"]);
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(db.filters).toContainEqual(["user_id",userId]);
    expect(db.filters).toContainEqual(["project_id",projectId]);
  });

  it("never loads malformed summary structures, missing IDs or bad threads",async()=>{
    const db=database([
      original("safe"),original("bad-array",{summary_json:["SECRET-ARRAY"]}),
      original("bad-id",{id:null,summary_json:{topics:["SECRET-ID"]}}),
      original("bad-thread",{thread_id:[],summary_json:{topics:["SECRET-THREAD"]}}),
    ]);
    const result=await getEpisodeRecall({...input,supabase:db.supabase});
    expect(result.map(item=>item.id)).toEqual(["safe"]);
    expect(JSON.stringify(result)).not.toContain("SECRET");
  });

  it("keeps project fallback disabled when project scope is absent",async()=>{
    const db=database([original("safe")]);
    expect(await getEpisodeRecall({...input,projectId:null,supabase:db.supabase})).toEqual([]);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("fails closed for malformed database result collections",async()=>{
    const db=database({not:"an array"});
    expect(await getEpisodeRecall({...input,supabase:db.supabase})).toEqual([]);
  });
});
