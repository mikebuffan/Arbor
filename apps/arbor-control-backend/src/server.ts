import http from "node:http";
import { z } from "zod";

import { ArborControlRuntime } from "./runtime.js";
import { JsonFileArborStateStore } from "./stateStore.js";
import { MikeBackendBridge } from "./backendBridge.js";
import { ArborVoiceRenderer } from "./voice.js";
import { requireControlAuth } from "./auth.js";

const store = new JsonFileArborStateStore();
const runtime = new ArborControlRuntime(
  store,
  new MikeBackendBridge(),
);
const voice = new ArborVoiceRenderer(store);

const TurnBody = z.object({
  userText: z.string().min(1).max(100_000),
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  turnId: z.string().optional(),
  channel: z.enum(["text", "voice"]).optional(),
});

const WorkspaceBody = z.object({
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  workspace: z.object({
    canon: z.array(z.string()),
    lockedPassages: z.array(z.string()),
    sceneState: z.array(z.string()),
    unresolvedDecisions: z.array(z.string()),
    workingDelta: z.string().nullable(),
  }),
});

const VoiceCorrectionBody = z.object({
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  correction: z.string().min(1).max(1000),
});

const port = Number(process.env.PORT ?? 4100);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? "localhost"}`,
    );

    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, {
        ok: true,
        service: "arbor-control-backend",
      });
      return;
    }

    requireControlAuth(req);

    if (req.method === "GET" && url.pathname === "/v1/state") {
      const state = await runtime.getState({
        projectId: url.searchParams.get("projectId") ?? undefined,
        conversationId:
          url.searchParams.get("conversationId") ?? undefined,
      });

      json(res, 200, {
        ok: true,
        state,
      });
      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === "/v1/annabelle/workspace"
    ) {
      const body = WorkspaceBody.parse(
        JSON.parse(await readBody(req)),
      );

      const state = await runtime.setAnnabelleWorkspace(body);

      json(res, 200, {
        ok: true,
        state,
      });
      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === "/v1/voice/correction"
    ) {
      const body = VoiceCorrectionBody.parse(
        JSON.parse(await readBody(req)),
      );

      const state = await runtime.addVoiceCorrection(body);

      json(res, 200, {
        ok: true,
        state,
      });
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/v1/voice/")) {
      const turnId = decodeURIComponent(
        url.pathname.slice("/v1/voice/".length),
      );

      if (!turnId) {
        json(res, 400, {
          ok: false,
          error: "turn_id_required",
        });
        return;
      }

      const rendered = await voice.renderTurn(turnId);

      res.writeHead(200, {
        "content-type": rendered.contentType,
        "cache-control": "no-store",
        "x-arbor-turn-id": turnId,
      });
      res.end(Buffer.from(rendered.audio));
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/turn") {
      const body = TurnBody.parse(
        JSON.parse(await readBody(req)),
      );

      const result = await runtime.runTurn(
        body,
        upstreamAuthorization(req),
      );

      json(res, 200, {
        ok: true,
        ...result,
      });
      return;
    }

    json(res, 404, {
      ok: false,
      error: "not_found",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "server_error";

    const status =
      message === "unauthorized"
        ? 401
        : message === "control_token_not_configured"
          ? 503
          : 500;

    json(res, status, {
      ok: false,
      error: message,
    });
  }
});

server.listen(port, () => {
  console.log(
    `Arbor control backend listening on :${port}`,
  );
});

function upstreamAuthorization(
  req: http.IncomingMessage,
): string | undefined {
  const raw =
    req.headers["x-arbor-upstream-authorization"];

  return Array.isArray(raw)
    ? raw[0]
    : raw;
}

function json(
  res: http.ServerResponse,
  status: number,
  body: unknown,
): void {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });

  res.end(JSON.stringify(body));
}

async function readBody(
  req: http.IncomingMessage,
): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk),
    );
  }

  return Buffer.concat(chunks).toString("utf8");
}
