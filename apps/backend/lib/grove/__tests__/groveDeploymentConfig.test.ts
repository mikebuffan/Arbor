import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
describe("combined Grove source deployment isolation",()=>{
 it("skips both child branches and preserves original cron configuration",()=>{
  for(const relative of ["../../../vercel.json","../../../../../vercel.json"]){
   const c=JSON.parse(readFileSync(new URL(relative,import.meta.url),"utf8"));
   expect(c.crons).toHaveLength(1);
   const run=(branch:string)=>spawnSync("sh",["-c",c.ignoreCommand],{env:{...process.env,VERCEL_GIT_COMMIT_REF:branch}}).status;
   expect(run("arbor/grove-combined-connection-20261006")).toBe(0);
   expect(run("arbor/grove-combined-acceptance-20261006")).toBe(0);
   expect(run("main")).toBe(1);
  }
 });
});
