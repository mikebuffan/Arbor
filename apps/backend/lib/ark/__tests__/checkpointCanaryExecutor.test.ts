import { describe, expect, it, vi } from "vitest";
import { ArkExecutorRegistry } from "@/lib/ark/executorRegistry";
import { registerArkCheckpointCanaryExecutor } from "@/lib/ark/checkpointCanaryExecutor";
import type { ArkClaim } from "@/lib/ark/types";

const OBJECTIVE = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-09-24T16:00:00.000Z");
const claim = (objectiveId: string, checkpointSequence: number) => ({
  objective: { id: objectiveId },
  task: { checkpointSequence, attemptCount: checkpointSequence + 1 },
} as ArkClaim);

describe("isolated Preview checkpoint canary", () => {
  it("is not present in the ordinary executor registry", () => {
    expect(new ArkExecutorRegistry().get("ark.preview-checkpoint")).toBeNull();
  });

  it("checkpoints the first attempt with a future resume and no external result", async () => {
    const registry = new ArkExecutorRegistry();
    registerArkCheckpointCanaryExecutor({ registry, pinnedObjectiveId: OBJECTIVE, now: () => NOW });
    const heartbeat = vi.fn().mockResolvedValue(undefined);
    const result = await registry.get("ark.preview-checkpoint")!({ claim: claim(OBJECTIVE, 0), heartbeat });
    expect(result).toEqual({
      status: "checkpointed",
      checkpoint: {
        sequence: 1, state: { phase: "waiting_for_new_worker" },
        nextAction: "Resume the authorized Preview checkpoint canary",
        reason: "interruption", resumeAfter: "2026-09-24T16:01:00.000Z",
      },
    });
    expect(heartbeat).toHaveBeenCalledTimes(1);
  });

  it("only after checkpoint recovery returns verified, side-effect-free completion", async () => {
    const registry = new ArkExecutorRegistry();
    registerArkCheckpointCanaryExecutor({ registry, pinnedObjectiveId: OBJECTIVE, now: () => NOW });
    const result = await registry.get("ark.preview-checkpoint")!({
      claim: claim(OBJECTIVE, 1), heartbeat: async () => {},
    });
    expect(result).toEqual({ status: "completed", result: {
      verified: true, capability: "ark.preview-checkpoint", attempts: 2,
      checkpointSequence: 1, previewOnly: true,
    } });
  });

  it("refuses work on any other objective before heartbeat", async () => {
    const registry = new ArkExecutorRegistry();
    registerArkCheckpointCanaryExecutor({ registry, pinnedObjectiveId: OBJECTIVE, now: () => NOW });
    const heartbeat = vi.fn();
    const result = await registry.get("ark.preview-checkpoint")!({
      claim: claim("22222222-2222-4222-8222-222222222222", 0), heartbeat,
    });
    expect(result).toMatchObject({ status: "blocked" });
    expect(heartbeat).not.toHaveBeenCalled();
  });
});
