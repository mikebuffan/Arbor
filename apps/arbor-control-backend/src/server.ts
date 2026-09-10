import http from "node:http";
import { z } from "zod";

import { ArborControlRuntime } from "./runtime.js";
import { InMemoryArborStateStore } from "./stateStore.js";
import { MikeBackendBridge } from "./backendBridge.js";

const runtime = new ArborControlRuntime(
  new InMemoryArborStateStore(),
  new MikeBackendBridge(),
);

const Body = z.object({
  userText: z.string().min(1).max(100_000),
  projectId: z.string().optional(),
  conversationId: z.string().optional(),
  turnId: z.string().optional(),
  channel: z.enum(["text", "voice"]).optional(),
});

const port = Number(process.env.PORT ?? 4100);

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      json(res, 200, {
        ok: true,
        service: "arbor-control-backend",
      });
      return;
    }

    if (req.method !== "POST" || req.url !== "/v1/turn") {
      json(res, 404, {
        ok: false,
        error: "not_found",
      });
      return;
    }

    const body = Body.parse(
      JSON.parse(await readBody(req)),
    );

    const result = await runtime.runTurn(
      body,
      req.headers.authorization,
    );

    json(res, 200, {
      ok: true,
      ...result,
    });
  } catch (error) {
    json(res, 500, {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "server_error",
    });
  }
});

server.listen(port, () => {
  console.log(
    `Arbor control backend listening on :${port}`,
  );
});

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
