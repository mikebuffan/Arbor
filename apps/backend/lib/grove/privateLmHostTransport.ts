import "server-only";

import { createHmac, randomBytes } from "node:crypto";

/**
 * Private Grove HOST -> independent Arbor LM v0.3.5 receiver.
 *
 * No public route imports this module. A future private chat route MUST first
 * authenticate the Grove owner, prove Firefly project+conversation ownership,
 * then call ARK/Layer's readArkLayerContext. The browser must never provide
 * readContext/ownerId or hold either server-side secret.
 *
 * This transport does not read/write ARK, store conversations, select work,
 * verify model claims, issue model tools or enable the public Arbor App.
 */
export type GroveHostTextTurn = {
  role: "user" | "assistant";
  content: string;
};

export type GroveLmHostTransportConfig = {
  url: string;
  apiKey: string;
  hmacKey: string;
};

export class GroveLmTransportError extends Error {
  constructor(
    public readonly code:
      | "private_lm_not_configured"
      | "private_lm_scope_rejected"
      | "private_lm_history_rejected"
      | "private_lm_unavailable"
      | "private_lm_bad_response",
  ) {
    super(code);
    this.name = "GroveLmTransportError";
  }
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function privateGroveLmHostConfig(
  env: Record<string, string | undefined> = process.env,
): GroveLmHostTransportConfig {
  const url = env.ARBOR_LM_PRIVATE_URL?.trim() ?? "";
  const apiKey = env.ARBOR_GROVE_API_KEY?.trim() ?? "";
  const hmacKey = env.ARBOR_GROVE_BROKER_HMAC_KEY?.trim() ?? "";
  let service: URL;
  try {
    service = new URL(url);
  } catch {
    throw new GroveLmTransportError("private_lm_not_configured");
  }
  const loopback = service.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(service.hostname);
  if (!(service.protocol === "https:" || loopback) ||
      service.username || service.password ||
      service.pathname !== "/" || service.search || service.hash ||
      apiKey.length < 16 || hmacKey.length < 32 ||
      apiKey === hmacKey) {
    throw new GroveLmTransportError("private_lm_not_configured");
  }
  return { url: service.origin, apiKey, hmacKey };
}

/** Minimal structural check; Python independently validates the full
 * strict ArkLayerReadContext schema and host-scoped signed request. */
function assertBoundContext(
  context: unknown,
  projectId: string,
  conversationId: string,
): asserts context is Record<string, unknown> {
  const x = context as Record<string, unknown> | null;
  const ark = x?.ark as Record<string, unknown> | undefined;
  const continuity = x?.continuity as Record<string, unknown> | undefined;
  const behavior = x?.behavior as Record<string, unknown> | undefined;
  const proof = behavior?.proof as Record<string, unknown> | undefined;
  const selected = x?.selectedAttachment as Record<string, unknown> | null;
  if (!x || typeof x !== "object" || Array.isArray(x) ||
      x.access !== "read-only" || x.projectId !== projectId ||
      !ark || typeof ark.available !== "boolean" ||
      ark.liveExecutionVerified !== false ||
      ark.activeObjectiveHandoff !== "not_resolved" ||
      !continuity || typeof continuity.available !== "boolean" ||
      !Object.prototype.hasOwnProperty.call(x, "selectedAttachment") ||
      !behavior || !proof || proof.schemaVersion !== 1 ||
      proof.contractVersion !== "2026-09-21.1" ||
      proof.mode !== "text" ||
      (selected !== null && selected !== undefined &&
        (selected.projectId !== projectId ||
          selected.conversationId !== conversationId ||
          selected.originalBytesRead !== false ||
          selected.citationVerified !== false))) {
    throw new GroveLmTransportError("private_lm_scope_rejected");
  }
}

function assertHistory(messages: readonly GroveHostTextTurn[]): void {
  if (!Array.isArray(messages) || messages.length < 1 ||
      messages.length > 13 || messages.length % 2 !== 1) {
    throw new GroveLmTransportError("private_lm_history_rejected");
  }
  let chars = 0;
  for (let i = 0; i < messages.length; i++) {
    const turn = messages[i];
    if (!turn || turn.role !== (i % 2 === 0 ? "user" : "assistant") ||
        typeof turn.content !== "string" ||
        !turn.content.trim() || turn.content.length > 3000) {
      throw new GroveLmTransportError("private_lm_history_rejected");
    }
    chars += turn.content.length;
  }
  if (chars > 12000) {
    throw new GroveLmTransportError("private_lm_history_rejected");
  }
}

export type GroveHostVerifiedTurn = {
  /** Each comes from a verified server-side auth/ownership read. */
  ownerId: string;
  projectId: string;
  conversationId: string;
  readContext: unknown;
  messages: readonly GroveHostTextTurn[];
};

export type GroveLmUnverifiedReply = {
  reply: string;
  model: "arbor-lm-v0.3";
  replyVerification: "unverified_model_text" | "known_action_claim_filtered";
  arkConnected: boolean;
  continuityFetched: boolean;
  liveExecutionVerified: false;
  workReceipts: [];
};

export async function sendPrivateGroveLmTurnFromVerifiedHost(
  input: GroveHostVerifiedTurn,
  options: {
    config?: GroveLmHostTransportConfig;
    request?: typeof fetch;
  } = {},
): Promise<GroveLmUnverifiedReply> {
  // Tests may inject configuration; never let an injected value bypass the
  // same TLS, path, credential and service-key checks as process.env.
  const config = options.config
    ? privateGroveLmHostConfig({
        ARBOR_LM_PRIVATE_URL: options.config.url,
        ARBOR_GROVE_API_KEY: options.config.apiKey,
        ARBOR_GROVE_BROKER_HMAC_KEY: options.config.hmacKey,
      })
    : privateGroveLmHostConfig();
  if (![input.ownerId, input.projectId, input.conversationId]
      .every(id => typeof id === "string" && uuid.test(id))) {
    throw new GroveLmTransportError("private_lm_scope_rejected");
  }
  assertBoundContext(input.readContext, input.projectId, input.conversationId);
  assertHistory(input.messages);

  const body = JSON.stringify({
    owner_id: input.ownerId,
    project_id: input.projectId,
    conversation_id: input.conversationId,
    context: input.readContext,
    messages: input.messages,
    max_new_tokens: 170,
  });
  // The v0.3.5-r2 receiver enforces a 32 KiB *raw UTF-8 body* cap.
  // Match its lower ceiling before sending/signing: 12k JS characters can
  // exceed 32 KiB with multibyte languages even when history is valid.
  if (Buffer.byteLength(body, "utf8") > 32768) {
    throw new GroveLmTransportError("private_lm_history_rejected");
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(24).toString("hex");
  const signature = createHmac("sha256", config.hmacKey)
    .update(timestamp + "\n" + nonce + "\n" + body)
    .digest("hex");

  let response: Response;
  try {
    response = await (options.request ?? fetch)(
      new URL("/v1/grove/chat-with-host-context", config.url),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-arbor-api-key": config.apiKey,
          "x-arbor-host-timestamp": timestamp,
          "x-arbor-host-nonce": nonce,
          "x-arbor-host-signature": signature,
        },
        body,
        signal: AbortSignal.timeout(180000),
        cache: "no-store",
      },
    );
  } catch {
    // Never log the request, context, URL with secrets or prompt text.
    throw new GroveLmTransportError("private_lm_unavailable");
  }
  if (!response.ok) {
    // 409 is a rejected replay, not an invitation to blindly retry.
    throw new GroveLmTransportError("private_lm_unavailable");
  }
  let decoded: unknown;
  try {
    decoded = await response.json();
  } catch {
    throw new GroveLmTransportError("private_lm_bad_response");
  }
  const data = decoded as Record<string, unknown> | null;
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      typeof data.reply !== "string" || !data.reply.trim() ||
      data.reply.length > 20000 ||
      data.model !== "arbor-lm-v0.3" ||
      data.app !== "the-grove" || data.experimental !== true ||
      data.external_actions_executed !== false ||
      data.live_execution_verified !== false ||
      data.active_objective_handoff !== "not_resolved" ||
      !Array.isArray(data.work_receipts) ||
      data.work_receipts.length !== 0 ||
      typeof data.ark_connected !== "boolean" ||
      data.ark_connected !==
        (input.readContext.ark as Record<string, unknown>).available ||
      typeof data.continuity_fetched !== "boolean" ||
      data.continuity_fetched !==
        (input.readContext.continuity as Record<string, unknown>)?.available ||
      !["unverified_model_text", "known_action_claim_filtered"]
        .includes(String(data.reply_verification))) {
    throw new GroveLmTransportError("private_lm_bad_response");
  }
  return {
    reply: data.reply.trim(),
    model: "arbor-lm-v0.3",
    replyVerification: data.reply_verification as
      GroveLmUnverifiedReply["replyVerification"],
    arkConnected: data.ark_connected as boolean,
    continuityFetched: data.continuity_fetched as boolean,
    liveExecutionVerified: false,
    workReceipts: [],
  };
}
