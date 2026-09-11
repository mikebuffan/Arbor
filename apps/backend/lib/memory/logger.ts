import { supabaseAdmin } from "@/lib/supabase/admin";

type LogLevel = "info" | "warn" | "error";

type PendingLog = {
  user_id: string;
  project_id: string | null;
  question: "";
  ops: Record<string, never>;
  memory_key: null;
  event_type: string;
  payload: Record<string, string | number | boolean | null>;
  created_at: string;
};

const buffer: PendingLog[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

const SAFE_STRING_FIELDS = new Set(["risk", "status", "source", "outcome"]);
const PRIVATE_FIELD_PATTERN =
  /(authorization|bearer|token|secret|prompt|content|text|message|summary|key|value|error|stack)/i;

function logIdentity(payload: Record<string, unknown>) {
  const userId =
    typeof payload.userId === "string"
      ? payload.userId
      : typeof payload.authedUserId === "string"
        ? payload.authedUserId
        : null;

  const projectId =
    typeof payload.projectId === "string" ? payload.projectId : null;

  return { userId, projectId };
}

function safeOperationalPayload(
  payload: Record<string, unknown>,
  level: LogLevel,
  durationMs: number | null,
): PendingLog["payload"] {
  const safe: PendingLog["payload"] = {
    level,
    duration_ms: durationMs,
  };

  for (const [key, value] of Object.entries(payload)) {
    if (PRIVATE_FIELD_PATTERN.test(key)) continue;
    if (key === "userId" || key === "authedUserId" || key === "projectId") {
      continue;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      safe[key] = value;
    } else if (typeof value === "boolean") {
      safe[key] = value;
    } else if (
      typeof value === "string" &&
      SAFE_STRING_FIELDS.has(key) &&
      value.length <= 64
    ) {
      safe[key] = value;
    }
  }

  return safe;
}

export async function logMemoryEvent(
  event: string,
  payload: Record<string, unknown>,
  level: LogLevel = "info",
  meta?: { start?: number; context?: string },
) {
  if (process.env.MEMORY_LOGGER_DISABLE === "1") return;

  const { userId, projectId } = logIdentity(payload);
  if (!userId) return;

  const durationMs = meta?.start ? Date.now() - meta.start : null;
  buffer.push({
    user_id: userId,
    project_id: projectId,
    question: "",
    ops: {},
    memory_key: null,
    event_type: event.slice(0, 120),
    payload: safeOperationalPayload(payload, level, durationMs),
    created_at: new Date().toISOString(),
  });

  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      void flushMemoryLogs();
    }, 2000);
  }
}

export async function flushMemoryLogs(): Promise<void> {
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (buffer.length === 0) return;

  const admin = supabaseAdmin();
  const logs = buffer.splice(0, buffer.length);

  try {
    const { error } = await admin.from("memory_pending").insert(logs);
    if (error) {
      console.error("[memory-logger] flush failed");
    }
  } catch {
    console.error("[memory-logger] flush failed");
  }
}
