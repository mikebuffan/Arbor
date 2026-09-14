import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { SpanStatusCode } from "@opentelemetry/api";

let _adminClient: SupabaseClient | null = null;

const SAFE_QUERY_LABELS = new Set(["database_query"]);

function safeQueryLabel(label: string): string {
  return SAFE_QUERY_LABELS.has(label) ? label : "database_query";
}

function safeQueryFailureCode(error: unknown): string {
  if (typeof error !== "object" || error === null) return "query_failed";

  const candidate = error as {
    code?: unknown;
    status?: unknown;
    message?: unknown;
  };
  if (candidate.status === 429) return "rate_limited";
  if (
    candidate.status === 500 ||
    candidate.status === 502 ||
    candidate.status === 503 ||
    candidate.status === 504
  ) {
    return "service_unavailable";
  }
  if (candidate.code === "PGRST000") return "connection_error";

  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  if (message.includes("timeout")) return "timeout";
  if (message.includes("fetch") || message.includes("network")) {
    return "network_error";
  }
  return "query_failed";
}

export function supabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !key) {
    throw new Error(
      "Supabase admin client missing environment vars (need SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  _adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-role": "admin" } },
  });

  return _adminClient;
}

export async function safeQuery<T>(
  fn: (client: ReturnType<typeof supabaseAdmin>) => Promise<T>,
  label: string,
  retries = 2
): Promise<T> {
  const client = supabaseAdmin();
  const operation = safeQueryLabel(label);

  return Sentry.startSpan(
    {
      op: "db.supabase",
      name: operation,
    },
    async (span) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await fn(client);
          span.setAttribute("attempt", attempt);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (err: any) {
          const isLastAttempt = attempt === retries;
          const code = safeQueryFailureCode(err);
          const shouldRetry =
            !isLastAttempt &&
            (err?.status === 500 ||
              err?.status === 503 ||
              err?.message?.includes("fetch") ||
              err?.message?.includes("timeout"));

          console.warn("[supabase] query failed", {
            subsystem: "supabase",
            operation,
            code,
            resourceType: "database_query",
            attempt: attempt + 1,
            maxAttempts: retries + 1,
            willRetry: shouldRetry,
          });

          if (attempt === 0 || isLastAttempt) {
            Sentry.captureMessage("supabase_query_failed", {
              level: isLastAttempt ? "error" : "warning",
              tags: {
                subsystem: "supabase",
                operation,
                error_code: code,
                retry_attempt: String(attempt + 1),
              },
            });
          }

          span.setAttribute("error_code", code);
          span.setAttribute("retry_attempt", attempt + 1);
          span.setAttribute("max_attempts", retries + 1);
          span.setAttribute("retry_scheduled", shouldRetry);

          if (shouldRetry) {
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
            continue;
          }

          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: "supabase_query_failed",
          });
          throw err;
        }
      }

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: "exceeded retries",
      });

      throw new Error("safe_query_failed_after_retries");
    }
  );
}
