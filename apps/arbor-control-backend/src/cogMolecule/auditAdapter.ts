import type { ArborAuditSink } from "../audit.js";
import type { MoleculeRunResult } from "./molecule.js";

export async function auditMoleculeRun(input: {
  sink: ArborAuditSink;
  turnId: string;
  projectId?: string;
  conversationId?: string;
  run: MoleculeRunResult;
}): Promise<void> {
  const { sink, turnId, projectId, conversationId, run } = input;

  for (const entry of run.trace) {
    await sink.record({
      turnId,
      projectId,
      conversationId,
      phase: "observe",
      event: "cog_molecule_node",
      detail: {
        subsystem: entry.node,
        round: entry.result.rounds,
        toolCalls: entry.result.computeSpent,
        complete: Boolean(entry.result.projection),
        unresolvedCount: entry.result.packet.unresolved.length,
      },
    });
  }

  await sink.record({
    turnId,
    projectId,
    conversationId,
    phase: "verify",
    event: "cog_molecule_complete",
    detail: {
      round: run.result.rounds,
      toolCalls: run.computeSpent,
      complete: Boolean(run.result.projection),
      unresolvedCount: run.result.packet.unresolved.length,
    },
  });
}