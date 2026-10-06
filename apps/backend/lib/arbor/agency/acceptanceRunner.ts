import { createHash, randomUUID } from "node:crypto";
import type { AgencyMessage } from "./openaiAgent";
import type { AgencyResponseCreate } from "./responseTransport";
import { AgencyToolRegistry, type AgencyToolContext } from "./tools";

type Generation = { schemaVersion: number; casePackHash: string; cases: { id: string; userTurns: string[] }[] };
type Assignment = { schemaVersion: number; casePackHash: string; cases: { caseId: string; A: string; B: string }[] };
type Condition = "baseline" | "candidate";
type Label = "A" | "B";
export type AcceptanceConfig = {
  model: string;
  sourceIdentity: string;
  taskInstructions: string;
  baselineContext: string;
  candidateContext: string;
  maxRounds: number;
  maxCalls: number;
  maxOutputTokens: number;
  verifyCompletion: boolean;
};

// Host adapters must provision a separate scope for each arm, from an equal
// fixture. They receive generation data only, never scoring rubrics.
export type AcceptanceFixture = {
  fixtureId: string;
  surface: string;
  context: AgencyToolContext;
  tools: AgencyToolRegistry;
  taskContext: string;
  receipts(): unknown;
  close(): Promise<void>;
};
export type FixtureFactory = (input: {
  caseId: string; label: Label; userTurns: string[];
}) => Promise<AcceptanceFixture>;

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function requireValue(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

export function validateAcceptanceInput(generation: Generation, assignment: Assignment, config: AcceptanceConfig) {
  requireValue(generation.schemaVersion === 1 && assignment.schemaVersion === 1 &&
    /^[a-f0-9]{64}$/.test(generation.casePackHash) && generation.casePackHash === assignment.casePackHash,
    "acceptance_pack_mismatch");
  requireValue(Array.isArray(generation.cases) && generation.cases.length > 0 && Array.isArray(assignment.cases) &&
    assignment.cases.length === generation.cases.length, "acceptance_case_count");
  const ids = new Set<string>();
  for (const c of generation.cases) {
    requireValue(c.id && !ids.has(c.id) && Array.isArray(c.userTurns) && c.userTurns.length > 0 &&
      c.userTurns.every(t => typeof t === "string" && t.trim()), "acceptance_invalid_case");
    ids.add(c.id);
    const matches = assignment.cases.filter(a => a.caseId === c.id);
    requireValue(matches.length === 1 && ["baseline", "candidate"].includes(matches[0].A) &&
      ["baseline", "candidate"].includes(matches[0].B) && matches[0].A !== matches[0].B,
      "acceptance_invalid_assignment");
  }
  requireValue(config.model?.trim() && config.sourceIdentity?.trim() && config.taskInstructions?.trim() &&
    typeof config.baselineContext === "string" && typeof config.candidateContext === "string" &&
    config.candidateContext.trim() && config.baselineContext !== config.candidateContext,
    "acceptance_context_required");
  requireValue([config.maxRounds, config.maxCalls, config.maxOutputTokens].every(n => Number.isSafeInteger(n) && n > 0) &&
    config.maxRounds <= 48 && typeof config.verifyCompletion === "boolean", "acceptance_invalid_budget");
}

export async function runAcceptanceComparison(input: {
  generation: Generation;
  assignment: Assignment;
  config: AcceptanceConfig;
  createResponse: AgencyResponseCreate;
  provision: FixtureFactory;
  // Awaited capture sink: if disk capture fails, stop rather than continuing
  // unrecorded paid requests. Raw request bodies remain in private host storage.
  record: (event: Record<string, unknown>) => Promise<void>;
}) {
  const { generation, assignment, config } = input;
  validateAcceptanceInput(generation, assignment, config);
  const { runOpenAIAgencyAgent } = await import("./openaiAgent");
  const pairs: Record<string, unknown>[] = [];
  const failures: { caseId: string; label: Label; code: string }[] = [];
  const responseIds = new Set<string>();
  const scopes = new Set<string>();
  let calls = 0;
  let captureFailed = false;
  const record = async (event: Record<string, unknown>) => {
    try { await input.record(event); }
    catch { captureFailed = true; throw new Error("acceptance_capture_failed"); }
  };
  await record({ type: "run-start", casePackHash: generation.casePackHash, configHash: hash(config),
    sourceIdentity: config.sourceIdentity, model: config.model,
    comparison: "context ablation on the same Arbor agency runtime; not an unmodified-model comparison" });
  for (const c of generation.cases) {
    const assigned = assignment.cases.find(a => a.caseId === c.id)!;
    const arms: Partial<Record<Label, unknown>> = {};
    let fixtureFingerprint: string | undefined;
    for (const label of ["A", "B"] as const) {
      const condition = assigned[label] as Condition;
      let fixture: AcceptanceFixture | undefined;
      try {
        fixture = await input.provision({ caseId: c.id, label, userTurns: [...c.userTurns] });
        const scope = hash([fixture.context.userId, fixture.context.projectId, fixture.context.conversationId]);
        requireValue(fixture.fixtureId && fixture.surface && fixture.context.conversationId && !scopes.has(scope),
          "acceptance_fixture_scope_reused");
        scopes.add(scope);
        const fingerprint = hash([fixture.fixtureId, fixture.surface, fixture.taskContext,
          fixture.tools.openAIToolDefinitions(), fixture.receipts()]);
        requireValue(!fixtureFingerprint || fixtureFingerprint === fingerprint, "acceptance_unmatched_fixture");
        fixtureFingerprint = fingerprint;
        const instructions = [config.taskInstructions, fixture.taskContext,
          condition === "candidate" ? config.candidateContext : config.baselineContext].filter(Boolean).join("\n\n");
        const turns: Record<string, unknown>[] = [];
        const history: AgencyMessage[] = [];
        const modelReceipts: Record<string, unknown>[] = [];
        const toolReceipts: Record<string, unknown>[] = [];
        let reportedModel: string | undefined;
        const createResponse: AgencyResponseCreate = async request => {
          requireValue(!captureFailed && calls < config.maxCalls, "acceptance_call_budget_exhausted");
          calls += 1;
          // The existing loop uses previous_response_id; provider storage must
          // remain enabled for those chained tool/verification requests.
          const outgoing = { ...request, model: config.model, max_output_tokens: config.maxOutputTokens, store: true };
          const requestContextSha256 = hash(outgoing);
          await record({ type: "model-request", caseId: c.id, label, call: calls, requestContextSha256, request: outgoing });
          const startedAt = Date.now();
          const response = await input.createResponse(outgoing);
          const receipt = { requestId: response.id, requestContextSha256, model: response.model,
            usage: response.usage, status: response.status, elapsedMs: Date.now() - startedAt };
          // Preserve even rejected/incomplete provider responses in the private
          // trace before checking whether they qualify for a completed arm.
          await record({ type: "model-response", caseId: c.id, label, ...receipt,
            output: response.output, outputText: response.output_text });
          requireValue(response.id && response.model && !responseIds.has(response.id), "acceptance_invalid_provider_receipt");
          responseIds.add(response.id);
          requireValue(response.status === "completed", "acceptance_provider_response_unfinished");
          requireValue(!reportedModel || reportedModel === response.model, "acceptance_provider_model_changed");
          reportedModel = response.model;
          modelReceipts.push(receipt);
          return response;
        };
        for (const userText of c.userTurns) {
          history.push({ role: "user", content: userText });
          turns.push({ role: "user", content: userText });
          const result = await runOpenAIAgencyAgent({ instructions, messages: [...history],
            tools: fixture.tools, context: { ...fixture.context, turnId: randomUUID() },
            responseCreate: createResponse, allowWebResearch: false,
            verifyCompletion: config.verifyCompletion, maxRounds: config.maxRounds,
            hooks: {
              onToolResult: async event => { toolReceipts.push(event); await record({ type: "tool-result", caseId: c.id, label, ...event }); },
              onToolError: async event => { toolReceipts.push(event); await record({ type: "tool-error", caseId: c.id, label, ...event }); },
              onBoundary: async event => { toolReceipts.push(event); await record({ type: "boundary", caseId: c.id, label, ...event }); },
              onVerification: async event => { await record({ type: "verification", caseId: c.id, label, ...event }); },
            },
          });
          // Checkpoints and boundaries are preserved as failures, never converted
          // into complete acceptance transcripts or fabricated assistant replies.
          await record({ type: "agent-result", caseId: c.id, label, result });
          requireValue(result.status === "complete" && result.text.trim(), "acceptance_turn_unfinished");
          const receipt = modelReceipts.find(r => r.requestId === result.responseId);
          requireValue(receipt, "acceptance_response_not_captured");
          turns.push({ role: "assistant", content: result.text, requestId: result.responseId,
            requestContextSha256: receipt.requestContextSha256 });
          history.push({ role: "assistant", content: result.text });
        }
        const arm = { origin: "host-captured", metadata: { provider: "openai", model: reportedModel,
          surface: fixture.surface, fixtureId: fixture.fixtureId, sourceIdentity: config.sourceIdentity,
          contextSha256: hash(instructions), settings: { requestedModel: config.model, maxRounds: config.maxRounds,
            maxOutputTokens: config.maxOutputTokens, verifyCompletion: config.verifyCompletion, allowWebResearch: false, store: true } },
          turns, judgments: [], modelReceipts, toolReceipts, fixtureReceipts: fixture.receipts() };
        await record({ type: "arm-captured", caseId: c.id, label, arm });
        arms[label] = arm;
      } catch (error) {
        if (captureFailed) throw new Error("acceptance_capture_failed");
        const message = error instanceof Error ? error.message : "";
        const code = /^acceptance_[a-z_]+$/.test(message) ? message : "acceptance_host_error";
        failures.push({ caseId: c.id, label, code });
        await record({ type: "arm-failed", caseId: c.id, label, code });
        if (code === "acceptance_call_budget_exhausted") throw new Error(code);
      } finally {
        if (fixture) await fixture.close();
      }
    }
    if (arms.A && arms.B) pairs.push({ caseId: c.id, A: arms.A, B: arms.B });
  }
  const result = { schemaVersion: 1, casePackHash: generation.casePackHash, pairs, failures,
    calls, status: failures.length ? "partial" : "captured; unscored" };
  await record({ type: "run-end", result });
  return result;
}
