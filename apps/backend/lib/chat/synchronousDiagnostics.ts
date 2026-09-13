import * as Sentry from "@sentry/nextjs";
import { SpanStatusCode } from "@opentelemetry/api";

export const CHAT_SYNCHRONOUS_STAGES = [
  "auth",
  "request_parse",
  "project_scope",
  "turn_resolution",
  "user_persistence",
  "agency_begin",
  "prompt_context",
  "runtime_begin",
  "timeline_begin",
  "model_agency",
  "assistant_persistence",
  "agency_finalize",
  "runtime_persistence",
  "post_response_schedule",
] as const;

export type ChatSynchronousStage =
  (typeof CHAT_SYNCHRONOUS_STAGES)[number];

const SAFE_PROVIDER_CODES = new Set([
  "context_length_exceeded",
  "insufficient_quota",
  "invalid_api_key",
  "invalid_function_parameters",
  "invalid_model",
  "model_not_found",
  "rate_limit_exceeded",
  "server_error",
]);

const SAFE_PROVIDER_ERROR_NAMES: Record<string, string> = {
  APIConnectionError: "provider_connection_failed",
  APIConnectionTimeoutError: "provider_timeout",
  APITimeoutError: "provider_timeout",
  AuthenticationError: "provider_authentication_failed",
  PermissionDeniedError: "provider_permission_denied",
  NotFoundError: "provider_model_unavailable",
  BadRequestError: "provider_request_rejected",
  RateLimitError: "provider_rate_limited",
  InternalServerError: "provider_unavailable",
};

const SAFE_AGENCY_ERROR_MESSAGES: Record<string, string> = {
  agency_input_required: "agency_input_required",
  agency_goal_required: "agency_goal_required",
  agency_tool_arguments_invalid: "agency_tool_arguments_invalid",
  agency_model_attempts_exhausted: "agency_model_attempts_exhausted",
};

const SAFE_DATABASE_CODES: Record<string, string> = {
  "23503": "foreign_key_violation",
  "23505": "unique_violation",
  "23514": "check_violation",
  "42501": "insufficient_privilege",
};

type SafeChatFailure = {
  subsystem: "chat";
  stage: ChatSynchronousStage;
  category: "application" | "database" | "provider";
  code: string;
  status: number | null;
};

function safeStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" && status >= 400 && status <= 599
    ? status
    : null;
}

function safeProviderCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && SAFE_PROVIDER_CODES.has(code)
    ? code
    : null;
}

function safeProviderNameCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const name = (error as { name?: unknown }).name;
  return typeof name === "string"
    ? SAFE_PROVIDER_ERROR_NAMES[name] ?? null
    : null;
}

function safeAgencyCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string"
    ? SAFE_AGENCY_ERROR_MESSAGES[message] ?? null
    : null;
}

function safeDatabaseCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const code = (error as { code?: unknown }).code;
  if (typeof code !== "string") return null;

  if (SAFE_DATABASE_CODES[code]) {
    return SAFE_DATABASE_CODES[code];
  }

  if (/^PGRST\d{3}$/.test(code)) {
    return `postgrest_${code.toLowerCase()}`;
  }

  return null;
}

function isProviderStage(stage: ChatSynchronousStage): boolean {
  return stage === "model_agency";
}

function isDatabaseStage(stage: ChatSynchronousStage): boolean {
  return [
    "project_scope",
    "turn_resolution",
    "user_persistence",
    "agency_begin",
    "prompt_context",
    "runtime_begin",
    "timeline_begin",
    "assistant_persistence",
    "agency_finalize",
    "runtime_persistence",
  ].includes(stage);
}

export function classifyChatSynchronousFailure(
  stage: ChatSynchronousStage,
  error: unknown,
): SafeChatFailure {
  const status = safeStatus(error);
  const providerCode = safeProviderCode(error);
  const providerNameCode = safeProviderNameCode(error);
  const agencyCode = isProviderStage(stage)
    ? safeAgencyCode(error)
    : null;
  const databaseCode = isDatabaseStage(stage)
    ? safeDatabaseCode(error)
    : null;

  const category = agencyCode
    ? "application"
    : isProviderStage(stage)
      ? "provider"
      : isDatabaseStage(stage)
        ? "database"
        : "application";

  let code =
    agencyCode ??
    providerCode ??
    providerNameCode ??
    databaseCode ??
    "unexpected_failure";

  if (
    !agencyCode &&
    !providerCode &&
    !providerNameCode &&
    isProviderStage(stage)
  ) {
    if (status === 400) code = "provider_request_rejected";
    else if (status === 401) code = "provider_authentication_failed";
    else if (status === 403) code = "provider_permission_denied";
    else if (status === 404) code = "provider_model_unavailable";
    else if (status === 408) code = "provider_timeout";
    else if (status === 429) code = "provider_rate_limited";
    else if (status !== null && status >= 500) {
      code = "provider_unavailable";
    } else code = "provider_request_failed";
  }

  return { subsystem: "chat", stage, category, code, status };
}

export function reportChatSynchronousFailure(input: {
  stage: ChatSynchronousStage;
  error: unknown;
}): void {
  const diagnostic = classifyChatSynchronousFailure(input.stage, input.error);

  try {
    console.warn("[chat] synchronous request failed", diagnostic);
  } catch {
    // Diagnostics must never replace the original route failure.
  }

  try {
    Sentry.startSpan(
      { op: "chat.request", name: "chat_synchronous_failure" },
      (span) => {
        span.setAttribute("subsystem", diagnostic.subsystem);
        span.setAttribute("stage", diagnostic.stage);
        span.setAttribute("error_category", diagnostic.category);
        span.setAttribute("error_code", diagnostic.code);
        if (diagnostic.status !== null) {
          span.setAttribute("error_status", diagnostic.status);
        }
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: "chat_synchronous_failure",
        });
        Sentry.captureMessage("chat_synchronous_failure", {
          level: "error",
          tags: {
            subsystem: diagnostic.subsystem,
            stage: diagnostic.stage,
            error_category: diagnostic.category,
            error_code: diagnostic.code,
            ...(diagnostic.status === null
              ? {}
              : { error_status: String(diagnostic.status) }),
          },
        });
      },
    );
  } catch {
    // Diagnostics must never replace the original route failure.
  }
}
