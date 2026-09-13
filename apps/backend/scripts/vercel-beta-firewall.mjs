const API_ROOT = "https://api.vercel.com";
const PROJECT_ID =
  process.env.VERCEL_PROJECT_ID ?? "prj_JArYlugmdFovY10CxZ0LEJmcrsKC";
const TEAM_ID =
  process.env.VERCEL_TEAM_ID ?? "team_QFZ2bCxtjj152YmrbebhivFi";
const RULE_NAME = "Arbor closed-beta expensive API limit";

function fail(message) {
  console.error(`[vercel-firewall] ${message}`);
  process.exit(1);
}

function integerEnv(name, fallback, min, max) {
  const raw = process.env[name];
  const value = raw == null ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

const WINDOW_SECONDS = integerEnv(
  "ARBOR_BETA_RATE_LIMIT_WINDOW_SECONDS",
  60,
  10,
  3600,
);
const REQUEST_LIMIT = integerEnv(
  "ARBOR_BETA_RATE_LIMIT_REQUESTS",
  60,
  1,
  10_000_000,
);

const desiredRule = {
  active: true,
  name: RULE_NAME,
  description:
    "Closed-beta edge rate limit for Arbor model-backed chat and Voice endpoints.",
  conditionGroup: [
    {
      conditions: [{ type: "path", op: "eq", value: "/api/chat" }],
    },
    {
      conditions: [{ type: "path", op: "pre", value: "/api/arbor/voice" }],
    },
  ],
  action: {
    mitigate: {
      action: "rate_limit",
      rateLimit: {
        algo: "fixed_window",
        window: WINDOW_SECONDS,
        limit: REQUEST_LIMIT,
        keys: ["ip"],
        action: "rate_limit",
      },
      redirect: null,
      actionDuration: null,
    },
  },
};

function queryString() {
  return new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID }).toString();
}

function safeError(payload) {
  if (!payload || typeof payload !== "object") return "request_failed";
  const error = payload.error;
  if (!error || typeof error !== "object") return "request_failed";
  const code = typeof error.code === "string" ? error.code : "request_failed";
  return code.slice(0, 120);
}

async function request(path, { method = "GET", body } = {}) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) fail("VERCEL_TOKEN is required");

  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Some successful activation responses may be empty.
  }

  if (!response.ok) {
    fail(`Vercel API ${method} ${path} failed: HTTP ${response.status} ${safeError(payload)}`);
  }

  return payload;
}

function findRule(config) {
  const candidates = [config?.draft, config?.active].filter(Boolean);
  for (const candidate of candidates) {
    const rule = Array.isArray(candidate.rules)
      ? candidate.rules.find((entry) => entry?.name === RULE_NAME)
      : null;
    if (rule) return rule;
  }
  return null;
}

function normalizedComparable(rule) {
  if (!rule) return null;
  return JSON.stringify({
    active: rule.active,
    name: rule.name,
    description: rule.description,
    conditionGroup: rule.conditionGroup,
    action: rule.action,
  });
}

async function getConfig() {
  return request(`/v1/security/firewall/config?${queryString()}`);
}

async function plan() {
  const config = await getConfig();
  const existing = findRule(config);
  const same = normalizedComparable(existing) === normalizedComparable(desiredRule);

  console.log(`[vercel-firewall] project=${PROJECT_ID}`);
  console.log(`[vercel-firewall] team=${TEAM_ID}`);
  console.log(
    `[vercel-firewall] desired=${REQUEST_LIMIT} requests/${WINDOW_SECONDS}s per IP`,
  );
  console.log(`[vercel-firewall] paths=/api/chat, /api/arbor/voice*`);
  console.log(
    existing
      ? `[vercel-firewall] existing rule id=${existing.id ?? "unknown"} match=${same}`
      : "[vercel-firewall] existing rule not found",
  );

  return { config, existing, same };
}

async function apply() {
  if (process.env.ALLOW_VERCEL_FIREWALL_PUBLISH !== "YES") {
    fail("set ALLOW_VERCEL_FIREWALL_PUBLISH=YES before applying firewall changes");
  }

  const { existing, same } = await plan();
  if (same) {
    console.log("[vercel-firewall] active/draft rule already matches desired configuration");
    return;
  }

  const mutation = existing?.id
    ? { action: "rules.update", id: existing.id, value: desiredRule }
    : { action: "rules.insert", id: null, value: desiredRule };

  await request(`/v1/security/firewall/config?${queryString()}`, {
    method: "PATCH",
    body: mutation,
  });

  const afterPatch = await getConfig();
  const draftVersion = afterPatch?.draft?.version;
  const stagedRule = Array.isArray(afterPatch?.draft?.rules)
    ? afterPatch.draft.rules.find((entry) => entry?.name === RULE_NAME)
    : null;

  if (!draftVersion || !stagedRule) {
    fail("firewall mutation did not produce the expected draft rule/version");
  }

  await request(
    `/v1/security/firewall/config/${encodeURIComponent(String(draftVersion))}/activate?${queryString()}`,
    { method: "POST" },
  );

  const active = await getConfig();
  const activeRule = Array.isArray(active?.active?.rules)
    ? active.active.rules.find((entry) => entry?.name === RULE_NAME)
    : null;

  if (normalizedComparable(activeRule) !== normalizedComparable(desiredRule)) {
    fail("firewall activation completed but active rule does not match desired configuration");
  }

  console.log("[vercel-firewall] published and verified");
}

const command = process.argv[2] ?? "plan";

if (command === "plan") {
  await plan();
} else if (command === "apply") {
  await apply();
} else {
  fail("usage: node scripts/vercel-beta-firewall.mjs [plan|apply]");
}
