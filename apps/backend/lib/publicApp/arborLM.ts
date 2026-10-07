/**
 * The PUBLIC app calls a dedicated, authenticated Arbor LM inference gateway.
 * Never import the Grove or the existing OpenAI production agent here.
 */
export type PublicModelMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class ArborLMUnavailable extends Error {
  constructor(
    public readonly code:
      | "model_not_configured"
      | "model_timeout"
      | "model_unavailable"
      | "model_bad_response"
      | "model_context_too_long",
    public readonly httpStatus: number = 503,
  ) {
    super(code);
    this.name = "ArborLMUnavailable";
  }
}

export type ArborLMConfig = {
  url: string;
  token: string;
  model: string;
  timeoutMs: number;
};

export function publicModelConfig(
  env: Record<string, string | undefined> = process.env,
): ArborLMConfig {
  const url = env.ARBOR_LM_INFERENCE_URL?.trim() ?? "";
  const token = env.ARBOR_LM_INFERENCE_TOKEN?.trim() ?? "";
  const model = env.ARBOR_LM_MODEL_ID?.trim() ?? "arbor-lm-v0.3";
  const timeout = Number(env.ARBOR_LM_TIMEOUT_MS ?? "30000");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ArborLMUnavailable("model_not_configured");
  }

  // URLs are a server-side deployment choice, never supplied by the user.
  // The inference service must be secured by TLS and server-to-server auth.
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    !token ||
    !Number.isInteger(timeout) ||
    timeout < 1000 ||
    timeout > 60000
  ) {
    throw new ArborLMUnavailable("model_not_configured");
  }
  return { url: parsed.toString(), token, model, timeoutMs: timeout };
}

export async function generateWithArborLM(
  messages: PublicModelMessage[],
  config: ArborLMConfig = publicModelConfig(),
  request: typeof fetch = fetch,
): Promise<string> {
  if (!messages.length || !messages.some((m) => m.role === "user")) {
    throw new ArborLMUnavailable("model_bad_response", 502);
  }
  let response: Response;
  try {
    response = await request(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + config.token,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_new_tokens: 320,
        temperature: 0.5,
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new ArborLMUnavailable("model_timeout", 504);
    }
    throw new ArborLMUnavailable("model_unavailable");
  }

  if (response.status === 413) {
    throw new ArborLMUnavailable("model_context_too_long", 422);
  }
  if (!response.ok) throw new ArborLMUnavailable("model_unavailable", 503);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ArborLMUnavailable("model_bad_response", 502);
  }

  if (!data || typeof data !== "object") {
    throw new ArborLMUnavailable("model_bad_response", 502);
  }
  const result = data as Record<string, unknown>;
  if (
    result.model !== config.model ||
    typeof result.assistantText !== "string" ||
    !result.assistantText.trim() ||
    result.assistantText.length > 20000
  ) {
    throw new ArborLMUnavailable("model_bad_response", 502);
  }
  return result.assistantText.trim();
}
