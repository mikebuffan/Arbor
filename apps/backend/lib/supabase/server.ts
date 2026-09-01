import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

function safeDiagnosticLabel(value: string, fallback: string): string {
  const candidate = value.slice(0, 64);
  return /^[a-z0-9_.:-]+$/i.test(candidate) ? candidate : fallback;
}

function safeRetryCode(error: unknown): string {
  if (typeof error !== "object" || error === null) return "unknown";

  const candidate = error as { code?: unknown; status?: unknown };
  if (typeof candidate.code === "string") {
    return safeDiagnosticLabel(candidate.code, "unknown");
  }
  if (typeof candidate.status === "number") return `http_${candidate.status}`;
  return "unknown";
}

export async function getServerSupabase() {
  return supabaseAdmin();
}

// Reliable retry wrapper
export async function supabaseRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      if (err?.status >= 500 || err?.code === "PGRST000") {
        console.warn("[supabase] request retry", {
          subsystem: "supabase",
          operation: "request_retry",
          code: safeRetryCode(err),
          resourceType: "database_request",
          attempt: i + 1,
          maxAttempts: retries,
        });
        await new Promise((r) => setTimeout(r, 200 * i));
      }
    }
  }
  throw new Error("Supabase retry failed after multiple attempts");
}

// Optional telemetry for development
export function logSupabaseEvent(eventType: string, payload: any) {
  void payload;
  if (process.env.NODE_ENV === "development") {
    console.debug("[supabase] event", {
      subsystem: "supabase",
      operation: safeDiagnosticLabel(eventType, "event"),
      code: "event",
      resourceType: "database_request",
    });
  }
}
