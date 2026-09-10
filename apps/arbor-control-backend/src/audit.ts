import {
  appendFile,
  mkdir,
  readFile,
} from "node:fs/promises";
import { dirname } from "node:path";

export type ArborAuditPhase =
  | "input"
  | "retrieve"
  | "decide"
  | "act"
  | "observe"
  | "verify"
  | "update"
  | "generate"
  | "persist"
  | "render"
  | "complete"
  | "blocked"
  | "error";

export type ArborAuditEvent = {
  id: string;
  at: string;
  turnId: string;
  projectId?: string;
  conversationId?: string;
  phase: ArborAuditPhase;
  event: string;
  detail?: Record<string, unknown>;
};

export interface ArborAuditSink {
  record(
    event: Omit<ArborAuditEvent, "id" | "at">,
  ): Promise<void>;

  recent(
    limit?: number,
  ): Promise<ArborAuditEvent[]>;
}

export class JsonlArborAuditSink
  implements ArborAuditSink
{
  constructor(
    private readonly file =
      process.env.ARBOR_AUDIT_FILE ??
      ".arbor-control/audit.jsonl",
  ) {}

  async record(
    event: Omit<ArborAuditEvent, "id" | "at">,
  ): Promise<void> {
    await mkdir(
      dirname(this.file),
      { recursive: true },
    );

    const row: ArborAuditEvent = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      ...event,
      detail: sanitizeDetail(event.detail),
    };

    await appendFile(
      this.file,
      `${JSON.stringify(row)}\n`,
      "utf8",
    );
  }

  async recent(
    limit = 100,
  ): Promise<ArborAuditEvent[]> {
    if (limit < 1) return [];

    try {
      const text = await readFile(
        this.file,
        "utf8",
      );

      return text
        .split("\n")
        .filter(Boolean)
        .slice(-Math.min(limit, 500))
        .map(
          (line) =>
            JSON.parse(line) as ArborAuditEvent,
        );
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return [];
      }

      throw error;
    }
  }
}

function sanitizeDetail(
  detail:
    | Record<string, unknown>
    | undefined,
): Record<string, unknown> | undefined {
  if (!detail) return undefined;

  const allowed = new Set([
    "subsystem",
    "channel",
    "round",
    "capability",
    "risk",
    "toolCalls",
    "complete",
    "unresolvedCount",
    "strategyCandidate",
    "voiceId",
    "characterCount",
    "blockedReason",
  ]);

  return Object.fromEntries(
    Object.entries(detail)
      .filter(([key]) => allowed.has(key))
      .slice(0, 20),
  );
}
