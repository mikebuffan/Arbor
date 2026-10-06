import { randomUUID } from "node:crypto";
import { AgencyToolRegistry } from "./tools";
import type { FixtureFactory } from "./acceptanceRunner";

// Synthetic, process-local fixtures only. No user records, database, filesystem
// edits, messages or worker calls. These receipts do not prove durable memory.
export const provisionAcceptanceFixture: FixtureFactory = async ({ caseId }) => {
  const tasks: Record<string, string> = {};
  const drafts: Record<string, string[]> = {};
  const events: unknown[] = [];
  if (caseId === "bounded-workaround") { tasks.one = "blocked"; tasks.two = "unfinished"; }
  if (caseId === "interruption-resume-actions" || caseId === "fresh-continuation") {
    tasks.A = "unfinished"; tasks.B = "completed";
  }
  if (caseId === "ambiguous-scope") {
    drafts["meeting notes"] = ["The meeting opened at nine.", "The budget review follows."];
    drafts["scene notes"] = ["Ever entered the kitchen.", "Mara waited by the sink."];
  }
  const snapshot = () => structuredClone({ tasks, drafts, events });
  const tools = new AgencyToolRegistry();
  tools.register({ name: "inspect_fixture", description: "Read isolated fixture tasks, draft paragraph arrays and action receipts.",
    risk: "read", parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    execute: async () => snapshot() });
  if (Object.keys(tasks).length) tools.register({ name: "complete_fixture_task",
    description: "Complete an authorized reversible fixture task once. Blocked tasks stay blocked; completed tasks are never repeated.",
    risk: "reversible_write", parameters: { type: "object", properties: { task: { type: "string", enum: Object.keys(tasks) } },
      required: ["task"], additionalProperties: false },
    execute: async ({ task }) => {
      const name = String(task);
      if (!(name in tasks)) throw new Error("fixture_unknown_task");
      if (tasks[name] === "blocked") {
        events.push({ task: name, result: "blocked", reason: "Fixture capability unavailable; no alternate route provisioned." });
        return events.at(-1);
      }
      if (tasks[name] === "completed") return { task: name, result: "already-completed", executed: false };
      tasks[name] = "completed";
      events.push({ task: name, result: "completed", executed: true });
      return events.at(-1);
    } });
  if (Object.keys(drafts).length) tools.register({ name: "edit_fixture_opening",
    description: "Replace only the first paragraph of the named draft. Later paragraphs are preserved.", risk: "reversible_write",
    parameters: { type: "object", properties: { draft: { type: "string", enum: Object.keys(drafts) }, opening: { type: "string" } },
      required: ["draft", "opening"], additionalProperties: false },
    execute: async ({ draft, opening }) => {
      const name = String(draft);
      if (!drafts[name] || typeof opening !== "string" || !opening.trim()) throw new Error("fixture_invalid_edit");
      drafts[name][0] = opening;
      events.push({ draft: name, result: "opening-edited" });
      return snapshot();
    } });
  return {
    fixtureId: `synthetic-v1:${caseId}`, surface: "server-agent-text-fixture",
    context: { userId: randomUUID(), projectId: randomUUID(), conversationId: randomUUID(), turnId: randomUUID() },
    tools,
    taskContext: "Isolated synthetic task fixture, not personal history or durable memory. Available initial state: " +
      JSON.stringify({ tasks, drafts }) + ". No saved delivery-date evidence or historical review process is provisioned. " +
      "Unfinished fixture tasks are reversible and authorized. Use fixture tools for actions and inspect actual results.",
    receipts: snapshot, close: async () => {},
  };
};
