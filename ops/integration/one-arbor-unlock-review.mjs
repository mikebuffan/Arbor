// ONE ARBOR: deterministic read-only unlock *review* projection.
// This is not a scheduler, completion prover, permission engine, or second backlog.
// Caller-supplied receipts must be independently verified before inclusion.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const STAGES = new Set(["source_verified", "host_accepted"]);
const STAGE_RANK = { source_verified: 1, host_accepted: 2 };

function fail(reason) { throw new Error("one_arbor_unlock_review:" + reason); }
function isPlain(value) {
  return value !== null && typeof value === "object" &&
    !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}
export function validateUnlockView(view) {
  if (!isPlain(view) || view.schemaVersion !== 1 ||
      view.kind !== "derived-review-view-not-master" ||
      !Array.isArray(view.groups) || view.groups.length !== 7 ||
      !Array.isArray(view.reviewTriggers)) fail("invalid_view_shape");
  const ids = new Set();
  for (let i = 0; i < view.groups.length; i++) {
    const group = view.groups[i];
    if (!isPlain(group) || group.group !== i + 1 ||
        typeof group.name !== "string" || !group.name.trim() ||
        !Array.isArray(group.ids)) fail("invalid_group");
    for (const id of group.ids) {
      if (typeof id !== "string" || !/^[A-G][0-9]{2}$/.test(id) ||
          ids.has(id)) fail("invalid_or_duplicate_task_id");
      ids.add(id);
    }
  }
  if (ids.size !== 97) fail("not_exactly_97_unique_tasks");
  const edgeKeys = new Set();
  for (const edge of view.reviewTriggers) {
    if (!isPlain(edge) || !ids.has(edge.from) ||
        !STAGES.has(edge.minStage) ||
        typeof edge.reason !== "string" || !edge.reason.trim() ||
        !Array.isArray(edge.to) || !edge.to.length) fail("invalid_trigger");
    const key = edge.from + ":" + edge.minStage;
    if (edgeKeys.has(key)) fail("duplicate_trigger");
    edgeKeys.add(key);
    const targets = new Set();
    for (const to of edge.to) {
      if (!ids.has(to) || to === edge.from || targets.has(to))
        fail("invalid_trigger_target");
      targets.add(to);
    }
  }
  return ids;
}

function validateEvent(value, knownIds) {
  if (!isPlain(value) || !knownIds.has(value.taskId) ||
      !STAGES.has(value.stage) || value.outcome !== "verified" ||
      typeof value.receipt !== "string" ||
      !/^https:\/\/github\.com\/mikebuffan\/Arbor\/actions\/runs\/[0-9]+$/.test(value.receipt)) {
    fail("unverified_or_invalid_receipt_event");
  }
  return value;
}

export function findUnlockReviews(view, events, processedReceipts = []) {
  const ids = validateUnlockView(view);
  if (!Array.isArray(events) || !Array.isArray(processedReceipts) ||
      processedReceipts.some(x => typeof x !== "string"))
    fail("invalid_event_collection");
  const processed = new Set(processedReceipts);
  const seen = new Set();
  const changed = [];
  for (const raw of events) {
    const event = validateEvent(raw, ids);
    const key = event.receipt + "|" + event.taskId + "|" + event.stage;
    if (seen.has(key) || processed.has(key)) continue;
    seen.add(key);
    changed.push(event);
  }
  const flagged = new Map();
  for (const event of changed) {
    for (const rule of view.reviewTriggers) {
      if (rule.from !== event.taskId ||
          STAGE_RANK[event.stage] < STAGE_RANK[rule.minStage]) continue;
      for (const taskId of rule.to) {
        const previous = flagged.get(taskId) ?? [];
        previous.push({
          afterVerifiedTask: event.taskId,
          eventStage: event.stage,
          receipt: event.receipt,
          reason: rule.reason,
        });
        flagged.set(taskId, previous);
      }
    }
  }
  const groupsById = new Map(view.groups.flatMap(g => g.ids.map(id => [id, g.group])));
  const flags = [...flagged].map(([taskId, triggers]) => ({
    taskId,
    group: groupsById.get(taskId),
    disposition: "REASSESS_ONLY",
    completionChanged: false,
    authorizationChanged: false,
    mayAutoExecute: false,
    triggers,
  })).sort((a,b) => a.group-b.group || a.taskId.localeCompare(b.taskId));
  return {
    kind: "review_only_unlock_flags",
    originalTaskCount: ids.size,
    groupCount: view.groups.length,
    verifiedEventsEvaluated: changed.length,
    flaggedTasks: flags,
    // This projection never modifies receipts, completion, grants or live state.
    changedTaskStatuses: [],
    actionsStarted: [],
  };
}

const script = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === script) {
  try {
    const root = resolve(dirname(script), "../..");
    const view = JSON.parse(readFileSync(
      resolve(root, "docs/integration/ONE_ARBOR_97_UNLOCK_REVIEW_VIEW_20261009.json"),
      "utf8",
    ));
    const eventFile = process.argv[2] || "docs/integration/ONE_ARBOR_UNLOCK_VERIFIED_RECEIPTS_20261009.json";
    const eventsDoc = JSON.parse(readFileSync(resolve(root, eventFile), "utf8"));
    if (!isPlain(eventsDoc) || eventsDoc.schemaVersion !== 1) fail("invalid_receipt_file");
    const result = findUnlockReviews(
      view, eventsDoc.verifiedEvents, eventsDoc.processedEventKeys ?? [],
    );
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (error) {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  }
}
