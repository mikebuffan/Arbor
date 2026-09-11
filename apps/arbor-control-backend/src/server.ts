import http from "node:http";
import {
  z,
  ZodError,
} from "zod";

import { JsonlArborAuditSink } from "./audit.js";
import { requireControlAuth } from "./auth.js";
import { MikeBackendBridge } from "./backendBridge.js";
import {
  assertProductionPersistenceConfigured,
  productionPersistenceStatus,
} from "./productionConfig.js";
import { ArborControlRuntime } from "./runtime.js";
import { SelfModelControlService } from "./selfModelControl.js";
import { JsonFileArborStateStore } from "./stateStore.js";
import type {
  ArborTransplantBundle,
} from "./transplant.js";
import { ArborVoiceRenderer } from "./voice.js";

assertProductionPersistenceConfigured();

const store = new JsonFileArborStateStore();
const audit = new JsonlArborAuditSink();
const runtime = new ArborControlRuntime(
  store,
  new MikeBackendBridge(),
  audit,
);
const selfModel = new SelfModelControlService(store);
const voice = new ArborVoiceRenderer(store, audit);

const ScopeFields = {
  projectId: z.string().min(1).max(500).optional(),
  conversationId: z.string().min(1).max(500).optional(),
};

const ScopeBody = z.object({
  ...ScopeFields,
});

const TurnBody = z.object({
  userText: z.string().min(1).max(100_000),
  ...ScopeFields,
  turnId: z.string().min(1).max(500).optional(),
  channel: z.enum(["text", "voice"]).optional(),
});

const WorkspaceBody = z.object({
  ...ScopeFields,
  workspace: z.object({
    canon: z.array(z.string()).max(500),
    lockedPassages: z.array(z.string()).max(500),
    sceneState: z.array(z.string()).max(500),
    unresolvedDecisions: z.array(z.string()).max(500),
    workingDelta: z.string().max(250_000).nullable(),
  }),
});

const VoiceCorrectionBody = z.object({
  ...ScopeFields,
  correction: z.string().min(1).max(1000),
});

const VoiceSelectBody = z.object({
  ...ScopeFields,
  voiceId: z.string().min(1).max(100),
});

const SelfModelObservationBody = z.object({
  ...ScopeFields,
  observation: z.object({
    targetKind: z.enum(["pattern", "family"]),
    targetId: z.string().min(1).max(200),
    domain: z.string().min(1).max(100),
    verdict: z.enum(["supports", "contradicts"]),
    evidence: z.string().min(1).max(2000),
    confidence: z.number().min(0).max(1),
    sourceTurnId: z.string().min(1).max(500).optional(),
  }),
});

const SelfModelMigrationBody = z.object({
  ...ScopeFields,
  expectedCurrentChecksum: z.string().min(1).max(200),
  reason: z.string().min(1).max(2000),
});

const TransplantImportBody = z.object({
  bundle: z.unknown(),
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

    if (req.method === "GET" && url.pathname === "/ready") {
      const persistence =
        productionPersistenceStatus();

      json(
        res,
        persistence.durableConfigurationReady
          ? 200
          : 503,
        {
          ok:
            persistence.durableConfigurationReady,
          service:
            "arbor-control-backend",
          persistence,
        },
      );
      return;
    }

    requireControlAuth(req);

    if (req.method === "GET" && url.pathname === "/v1/audit") {
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const events = await audit.recent(
        Number.isFinite(limit)
          ? Math.max(1, Math.min(limit, 500))
          : 100,
      );

      json(res, 200, {
        ok: true,
        events,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/v1/state") {
      const state = await runtime.getState(
        scopeFromUrl(url),
      );

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
      const body = WorkspaceBody.parse(await readJson(req));
      const state = await runtime.setAnnabelleWorkspace(body);

      json(res, 200, {
        ok: true,
        state,
      });
      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === "/v1/annabelle/restore"
    ) {
      const body = ScopeBody.parse(await readJson(req));
      const state = await runtime.restoreAnnabelleWorkspace(body);

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
      const body = VoiceCorrectionBody.parse(await readJson(req));
      const state = await runtime.addVoiceCorrection(body);

      json(res, 200, {
        ok: true,
        state,
      });
      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === "/v1/voice/select"
    ) {
      const body = VoiceSelectBody.parse(await readJson(req));
      const state = await runtime.setVoice(body);

      json(res, 200, {
        ok: true,
        voiceId: state.voiceId,
      });
      return;
    }

    if (
      req.method === "GET" &&
      url.pathname.startsWith("/v1/voice/")
    ) {
      const turnId = decodeURIComponent(
        url.pathname.slice("/v1/voice/".length),
      );

      if (!turnId) {
        throw new Error("turn_id_required");
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

    if (
      req.method === "POST" &&
      url.pathname === "/v1/self-model/observe"
    ) {
      const body =
        SelfModelObservationBody.parse(
          await readJson(req),
        );

      const result =
        await selfModel.recordObservation(body);

      json(res, 200, {
        ok: true,
        ...result,
      });
      return;
    }

    if (
      req.method === "GET" &&
      url.pathname === "/v1/self-model/migration"
    ) {
      const plan =
        await selfModel.previewMigration(
          scopeFromUrl(url),
        );

      json(res, 200, {
        ok: true,
        plan,
      });
      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === "/v1/self-model/migration"
    ) {
      const body =
        SelfModelMigrationBody.parse(
          await readJson(req),
        );

      const result =
        await selfModel.applyMigration(body);

      json(res, 200, {
        ok: true,
        ...result,
      });
      return;
    }

    if (
      req.method === "GET" &&
      url.pathname === "/v1/transplant/export"
    ) {
      const bundle =
        await selfModel.exportTransplant(
          scopeFromUrl(url),
        );

      json(res, 200, {
        ok: true,
        bundle,
      });
      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === "/v1/transplant/import"
    ) {
      const body =
        TransplantImportBody.parse(
          await readJson(req),
        );

      await selfModel.importTransplant(
        body.bundle as ArborTransplantBundle,
      );

      json(res, 200, {
        ok: true,
        imported: true,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/turn") {
      const body = TurnBody.parse(await readJson(req));
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
    const publicError = classifyError(error);

    if (publicError.status >= 500) {
      console.error(
        "[arbor-control] request failed",
        error,
      );
    }

    json(res, publicError.status, {
      ok: false,
      error: publicError.code,
    });
  }
});

server.listen(port, () => {
  console.log(
    `Arbor control backend listening on :${port}`,
  );
});

function scopeFromUrl(url: URL): {
  projectId?: string;
  conversationId?: string;
} {
  return {
    projectId: url.searchParams.get("projectId") ?? undefined,
    conversationId:
      url.searchParams.get("conversationId") ?? undefined,
  };
}

function upstreamAuthorization(
  req: http.IncomingMessage,
): string | undefined {
  const raw = req.headers["x-arbor-upstream-authorization"];
  return Array.isArray(raw) ? raw[0] : raw;
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

async function readJson(
  req: http.IncomingMessage,
): Promise<unknown> {
  const raw = await readBody(req);

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("invalid_json");
  }
}

async function readBody(
  req: http.IncomingMessage,
): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk);

    total += buffer.byteLength;

    if (total > 1_100_000) {
      throw new Error("body_too_large");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function classifyError(error: unknown): {
  status: number;
  code: string;
} {
  if (error instanceof ZodError) {
    return {
      status: 400,
      code: "invalid_request",
    };
  }

  const message =
    error instanceof Error
      ? error.message
      : "";

  switch (message) {
    case "unauthorized":
      return {
        status: 401,
        code: "unauthorized",
      };

    case "control_token_not_configured":
      return {
        status: 503,
        code: "control_unavailable",
      };

    case "invalid_json":
      return {
        status: 400,
        code: "invalid_json",
      };

    case "body_too_large":
      return {
        status: 413,
        code: "body_too_large",
      };

    case "turn_id_required":
    case "voice_not_allowed":
    case "self_model_observation_domain_required":
    case "self_model_observation_evidence_required":
    case "self_model_observation_confidence_invalid":
    case "self_model_observation_pattern_unknown":
    case "self_model_observation_family_invalid":
    case "self_model_observation_family_unknown":
    case "self_model_migration_reason_required":
    case "self_model_migration_not_required":
      return {
        status: 400,
        code: message,
      };

    case "turn_id_conflict":
    case "control_state_missing":
    case "self_model_identity_drift":
    case "self_model_migration_source_missing":
    case "self_model_migration_stale":
    case "transplant_target_not_empty":
    case "transplant_identity_checksum_mismatch":
    case "transplant_checksum_mismatch":
    case "transplant_scope_mismatch":
    case "transplant_turn_scope_mismatch":
    case "transplant_duplicate_turn":
      return {
        status: 409,
        code: message,
      };

    case "canonical_turn_not_found":
    case "annabelle_revision_not_found":
    case "transplant_scope_not_found":
      return {
        status: 404,
        code: message,
      };

    case "transplant_schema_unsupported":
    case "transplant_identity_missing":
      return {
        status: 400,
        code: message,
      };

    default:
      return {
        status: 500,
        code: "server_error",
      };
  }
}
