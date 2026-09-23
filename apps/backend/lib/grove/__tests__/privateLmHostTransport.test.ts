import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GroveLmTransportError,
  privateGroveLmHostConfig,
  sendPrivateGroveLmTurnFromVerifiedHost,
  type GroveHostVerifiedTurn,
} from "../privateLmHostTransport";

const config = {
  url: "https://private-model.example.org/",
  apiKey: "synthetic-server-only-grove-api-key",
  hmacKey: "synthetic-grove-host-hmac-key-over-32-characters",
};
const ownerId = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000002";
const conversationId = "00000000-0000-4000-8000-000000000003";

function context() {
  return {
    access: "read-only",
    projectId,
    ark: {
      available: false,
      activeObjectiveHandoff: "not_resolved",
      liveExecutionVerified: false,
    },
    continuity: {available: false},
    selectedAttachment: null,
    behavior: {
      proof: {
        schemaVersion: 1, contractVersion: "2026-09-21.1", mode: "text",
      },
    },
  };
}
function input(): GroveHostVerifiedTurn {
  return {
    ownerId, projectId, conversationId, readContext: context(),
    messages: [{role: "user", content: "Hey, Arbor."}],
  };
}
function result(overrides: Record<string, unknown> = {}) {
  return {
    reply: "Hey, Firefly.",
    model: "arbor-lm-v0.3",
    app: "the-grove",
    experimental: true,
    ark_connected: false,
    continuity_fetched: false,
    live_execution_verified: false,
    active_objective_handoff: "not_resolved",
    external_actions_executed: false,
    work_receipts: [],
    reply_verification: "unverified_model_text",
    ...overrides,
  };
}
function fakeFetch(out: unknown = result(), status = 200) {
  return vi.fn(async (_url: URL, _init?: RequestInit) =>
    Response.json(out, {status}));
}

afterEach(() => vi.unstubAllEnvs());

describe("private host configuration", () => {
  it("allows only a private HTTPS origin or local loopback", () => {
    expect(privateGroveLmHostConfig({
      ARBOR_LM_PRIVATE_URL: config.url,
      ARBOR_GROVE_API_KEY: config.apiKey,
      ARBOR_GROVE_BROKER_HMAC_KEY: config.hmacKey,
    }).url).toBe("https://private-model.example.org");
    expect(privateGroveLmHostConfig({
      ARBOR_LM_PRIVATE_URL: "http://127.0.0.1:8080",
      ARBOR_GROVE_API_KEY: config.apiKey,
      ARBOR_GROVE_BROKER_HMAC_KEY: config.hmacKey,
    }).url).toBe("http://127.0.0.1:8080");
  });

  it.each([
    "", "http://remote-model.example.org",
    "https://user:pass@private-model.example.org",
    "https://private-model.example.org/private",
    "https://private-model.example.org/?token=leak",
  ])("rejects unsafe model host URL: %s", (url) => {
    expect(() => privateGroveLmHostConfig({
      ARBOR_LM_PRIVATE_URL: url,
      ARBOR_GROVE_API_KEY: config.apiKey,
      ARBOR_GROVE_BROKER_HMAC_KEY: config.hmacKey,
    })).toThrow(GroveLmTransportError);
  });

  it("does not issue network requests with absent server-only secrets", async () => {
    const request = fakeFetch();
    await expect(sendPrivateGroveLmTurnFromVerifiedHost(input(), {
      config: {...config, hmacKey: "too-short"},
      request: request as unknown as typeof fetch,
    })).rejects.toMatchObject({code: "private_lm_not_configured"});
    expect(request).not.toHaveBeenCalled();
  });
});

describe("trusted Grove LM host envelope", () => {
  it("signs exact raw body with fresh timestamp and unique nonce", async () => {
    const request = fakeFetch();
    const send = () => sendPrivateGroveLmTurnFromVerifiedHost(input(), {
      config, request: request as unknown as typeof fetch,
    });
    const first = await send();
    await send();
    expect(first).toEqual({
      reply: "Hey, Firefly.",
      model: "arbor-lm-v0.3",
      replyVerification: "unverified_model_text",
      arkConnected: false,
      continuityFetched: false,
      liveExecutionVerified: false,
      workReceipts: [],
    });
    expect(request).toHaveBeenCalledTimes(2);
    const [url, options] = request.mock.calls[0];
    expect(url.toString()).toBe(
      "https://private-model.example.org/v1/grove/chat-with-host-context",
    );
    const headers = options!.headers as Record<string, string>;
    const body = options!.body as string;
    const nonce = headers["x-arbor-host-nonce"];
    const timestamp = headers["x-arbor-host-timestamp"];
    expect(headers["x-arbor-api-key"]).toBe(config.apiKey);
    expect(nonce).toMatch(/^[a-f0-9]{48}$/);
    expect(Math.abs(Number(timestamp) - Math.floor(Date.now() / 1000)))
      .toBeLessThan(90);
    expect(headers["x-arbor-host-signature"]).toBe(createHmac(
      "sha256", config.hmacKey,
    ).update(timestamp + "\n" + nonce + "\n" + body).digest("hex"));
    expect(JSON.parse(body)).toMatchObject({
      owner_id: ownerId,
      project_id: projectId,
      conversation_id: conversationId,
      max_new_tokens: 170,
      context: {access: "read-only", projectId},
      messages: [{role: "user", content: "Hey, Arbor."}],
    });
    const secondHeaders =
      request.mock.calls[1][1]!.headers as Record<string, string>;
    expect(secondHeaders["x-arbor-host-nonce"]).not.toBe(nonce);
    expect(options!.cache).toBe("no-store");
  });

  it("rejects unverified identifiers and cross-scope context pre-network", async () => {
    const request = fakeFetch();
    const cases: GroveHostVerifiedTurn[] = [
      {...input(), ownerId: "client-owner"},
      {...input(), projectId: "not-a-uuid"},
      {...input(), readContext: {...context(), projectId: ownerId}},
      {...input(), readContext: {...context(), access: "read-write"}},
      {...input(), readContext: {...context(),
        ark: {...context().ark, liveExecutionVerified: true}}},
      {...input(), readContext: {...context(),
        behavior: {proof: {...context().behavior.proof, mode: "voice"}}}},
      {...input(), readContext: {...context(), selectedAttachment: {
        projectId, conversationId: ownerId, originalBytesRead: false,
        citationVerified: false,
      }}},
      {...input(), readContext: {...context(), selectedAttachment: {
        projectId, conversationId, originalBytesRead: true,
        citationVerified: false,
      }}},
    ];
    for (const item of cases) {
      await expect(sendPrivateGroveLmTurnFromVerifiedHost(item, {
        config, request: request as unknown as typeof fetch,
      })).rejects.toMatchObject({code: "private_lm_scope_rejected"});
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects malformed, overlong or non-alternating history pre-network", async () => {
    const request = fakeFetch();
    const cases: GroveHostVerifiedTurn["messages"][] = [
      [],
      [{role: "assistant", content: "wrong start"}],
      [{role: "user", content: " "}],
      [{role: "user", content: "x".repeat(3001)}],
      [{role: "user", content: "hi"}, {role: "user", content: "again"}],
      Array.from({length: 15}, (_, i) => ({
        role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
        content: "hi",
      })),
    ];
    for (const messages of cases) {
      await expect(sendPrivateGroveLmTurnFromVerifiedHost(
        {...input(), messages}, {
          config, request: request as unknown as typeof fetch,
        },
      )).rejects.toMatchObject({code: "private_lm_history_rejected"});
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("does not expose credentials or retry after model host failure", async () => {
    const request = fakeFetch({error: "replay"}, 409);
    await expect(sendPrivateGroveLmTurnFromVerifiedHost(input(), {
      config, request: request as unknown as typeof fetch,
    })).rejects.toMatchObject({code: "private_lm_unavailable"});
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects fake execution receipts and contradictory read claims", async () => {
    const cases = [
      result({live_execution_verified: true}),
      result({external_actions_executed: true}),
      result({work_receipts: [{verified: true}]}),
      result({active_objective_handoff: "executing"}),
      result({ark_connected: true}),
      result({continuity_fetched: true}),
      result({reply_verification: "verified"}),
      result({app: "arbor-public-alpha"}),
      result({reply: ""}),
    ];
    for (const out of cases) {
      const request = fakeFetch(out);
      await expect(sendPrivateGroveLmTurnFromVerifiedHost(input(), {
        config, request: request as unknown as typeof fetch,
      })).rejects.toMatchObject({code: "private_lm_bad_response"});
    }
  });
});
