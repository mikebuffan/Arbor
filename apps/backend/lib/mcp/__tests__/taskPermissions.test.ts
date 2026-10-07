import {afterEach,describe,expect,it,vi} from "vitest";
import {ARK_READ_TASK_SUBMIT_PERMISSION,arkReadTaskProjects,isArkMcpSubmissionEnabled,isArkPatternHopSubmissionEnabled} from "../taskPermissions";
const project="11111111-1111-4111-8111-111111111111";
afterEach(()=>vi.unstubAllEnvs());
describe("ARK MCP authorization boundary",()=>{
 it("requires the server enable flag",()=>{
  vi.stubEnv("ARBOR_ENABLE_ARK_MCP_SUBMISSION","false");expect(isArkMcpSubmissionEnabled()).toBe(false);
  vi.stubEnv("ARBOR_ENABLE_ARK_MCP_SUBMISSION","true");expect(isArkMcpSubmissionEnabled()).toBe(true);
  vi.stubEnv("ARBOR_ENABLE_ARK_MCP_PATTERN_HOP","false");expect(isArkPatternHopSubmissionEnabled()).toBe(false);
 });
 it("grants only exact client permission and valid project ids from app metadata",()=>{
  const metadata={arbor_ark_mcp:{client_ids:["client-a"],permissions:[ARK_READ_TASK_SUBMIT_PERMISSION],
    project_ids:[project,project,"not-a-uuid"]}};
  expect(arkReadTaskProjects(metadata,"client-a")).toEqual([project]);
  expect(arkReadTaskProjects(metadata,"client-b")).toEqual([]);
  expect(arkReadTaskProjects({arbor_ark_mcp:{...metadata.arbor_ark_mcp,permissions:["other"]}},"client-a")).toEqual([]);
 });
 it("treats missing or malformed server metadata as no grant",()=>{
  expect(arkReadTaskProjects(null,"client-a")).toEqual([]);
  expect(arkReadTaskProjects({arbor_ark_mcp:{client_ids:"client-a",permissions:[ARK_READ_TASK_SUBMIT_PERMISSION],project_ids:[project]}},"client-a")).toEqual([]);
  expect(arkReadTaskProjects({arbor_ark_mcp:{client_ids:["client-a"],permissions:[ARK_READ_TASK_SUBMIT_PERMISSION],project_ids:[project]}},null)).toEqual([]);
 });
});
