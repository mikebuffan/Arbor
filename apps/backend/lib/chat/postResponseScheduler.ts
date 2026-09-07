import "server-only";

import { after } from "next/server";

export const CHAT_POST_RESPONSE_TASKS = [
  "telemetry",
  "memory_pipeline",
  "conversation_update",
  "decision_outcome",
] as const;

export type ChatPostResponseTaskName =
  (typeof CHAT_POST_RESPONSE_TASKS)[number];

export type ContinuationRegistrar = (
  callback: () => Promise<void>,
) => void;

export type ChatPostResponseOperations = Record<
  ChatPostResponseTaskName,
  () => Promise<unknown>
>;

function safeDiagnosticCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "operation_failed";
  }

  const candidate = String(error.code).slice(0, 32);
  return /^[a-z0-9_]+$/i.test(candidate)
    ? candidate
    : "operation_failed";
}

export function createPostResponseScheduler(
  registerContinuation: ContinuationRegistrar = after,
) {
  const tasks: Array<{
    name: ChatPostResponseTaskName;
    operation: () => Promise<unknown>;
  }> = [];
  let committed = false;

  return {
    schedule(
      name: ChatPostResponseTaskName,
      operation: () => Promise<unknown>,
    ) {
      if (committed) {
        throw new Error("post_response_scheduler_already_committed");
      }
      tasks.push({ name, operation });
    },

    commit() {
      if (committed) return;
      committed = true;
      const scheduled = [...tasks];
      if (!scheduled.length) return;

      registerContinuation(async () => {
        await Promise.all(
          scheduled.map(async ({ name, operation }) => {
            try {
              await operation();
            } catch (error: unknown) {
              console.warn("[post-response] operation failed", {
                subsystem: "chat",
                operation: name,
                code: safeDiagnosticCode(error),
              });
            }
          }),
        );
      });
    },
  };
}

export function scheduleChatPostResponseWork(params: {
  newlyCreated: boolean;
  operations: ChatPostResponseOperations;
  registerContinuation?: ContinuationRegistrar;
}) {
  if (!params.newlyCreated) return false;

  const scheduler = createPostResponseScheduler(
    params.registerContinuation,
  );
  for (const name of CHAT_POST_RESPONSE_TASKS) {
    scheduler.schedule(name, params.operations[name]);
  }
  scheduler.commit();
  return true;
}
