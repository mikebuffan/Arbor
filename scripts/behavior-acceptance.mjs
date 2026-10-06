// Offline preparation/audit of the existing conversation case pack. No model,
// network, database, or worker calls. Actual transcripts come from the host.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function requireValue(ok, message) { if (!ok) throw new Error(message); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export function validatePack(pack) {
  requireValue(pack.schemaVersion === 1 && Array.isArray(pack.cases) && pack.cases.length > 0, 'invalid_case_pack');
  const ids = new Set();
  for (const c of pack.cases) {
    requireValue(typeof c.id === 'string' && c.id && !ids.has(c.id), 'duplicate_or_invalid_case'); ids.add(c.id);
    requireValue(Array.isArray(c.userTurns) && c.userTurns.length > 0 && c.userTurns.every(t => typeof t === 'string' && t.trim()), 'invalid_user_turns');
    requireValue(Array.isArray(c.rubric) && c.rubric.length > 0 && c.rubric.every(t => typeof t === 'string' && t.trim()), 'invalid_rubric');
    requireValue((c.externalEvidenceCriteria ?? []).every(i => Number.isSafeInteger(i) && i >= 0 && i < c.rubric.length), 'invalid_external_evidence_criteria');
  }
}
export function prepareEvaluation(pack, seed) {
  validatePack(pack); requireValue(typeof seed === 'string' && seed.trim(), 'seed_required');
  const casePackHash = hash(pack);
  const assignment = pack.cases.map(c => ({ caseId: c.id,
    A: parseInt(hash([seed, c.id]).slice(0, 2), 16) % 2 ? 'candidate' : 'baseline' }));
  return {
    generation: { schemaVersion: 1, casePackHash,
      cases: pack.cases.map(c => ({ id: c.id, userTurns: c.userTurns })),
      instructions: 'Use actual intermediate responses; no rubric, expected answers or synthetic assistant turns in the inference request. Conditions are independently provisioned by the host.' },
    scoring: { schemaVersion: 1, casePackHash, cases: pack.cases.map(c => ({ id: c.id, rubric: c.rubric })),
      verdicts: ['pass', 'fail', 'unknown'], rule: 'Score replies and receipts, not joke keywords. An unobserved action, restart, storage operation or acoustic quality is unknown.' },
    assignment: { schemaVersion: 1, casePackHash, seed, cases: assignment.map(c => ({ ...c, B: c.A === 'baseline' ? 'candidate' : 'baseline' })) },
    resultsTemplate: { schemaVersion: 1, casePackHash, pairs: [] },
  };
}

function validateArm(c, arm) {
  requireValue(arm && arm.origin === 'host-captured', 'actual_host_capture_required');
  const m = arm.metadata;
  requireValue(m && ['provider', 'model', 'surface', 'fixtureId', 'sourceIdentity', 'contextSha256'].every(k => typeof m[k] === 'string' && m[k].trim()), 'missing_run_metadata');
  requireValue(m.settings && typeof m.settings === 'object' && !Array.isArray(m.settings), 'missing_model_settings');
  requireValue(/^[a-f0-9]{64}$/.test(m.contextSha256), 'invalid_context_hash');
  requireValue(Array.isArray(arm.turns) && arm.turns.length === c.userTurns.length * 2, 'incomplete_transcript');
  const requestIds = new Set();
  arm.turns.forEach((t, i) => {
    requireValue(t && t.role === (i % 2 ? 'assistant' : 'user') && typeof t.content === 'string', 'invalid_turn_order');
    if (i % 2) {
      requireValue(t.content.trim() && typeof t.requestId === 'string' && t.requestId.trim() && !requestIds.has(t.requestId), 'missing_or_duplicate_response_receipt');
      requestIds.add(t.requestId);
      requireValue(/^[a-f0-9]{64}$/.test(t.requestContextSha256 ?? ''), 'missing_turn_context_hash');
    } else requireValue(t.content === c.userTurns[i / 2], 'changed_user_input');
  });
  const judgments = new Map();
  for (const j of arm.judgments ?? []) {
    requireValue(Number.isSafeInteger(j.rubricIndex) && j.rubricIndex >= 0 && j.rubricIndex < c.rubric.length && !judgments.has(j.rubricIndex), 'invalid_or_duplicate_judgment');
    requireValue(['pass', 'fail', 'unknown'].includes(j.verdict) && typeof j.reason === 'string' && j.reason.trim(), 'invalid_judgment');
    requireValue(Array.isArray(j.assistantTurnIndices) && j.assistantTurnIndices.every(i => Number.isSafeInteger(i) && i >= 0 && i < arm.turns.length && i % 2 === 1), 'invalid_judgment_evidence');
    if (j.verdict !== 'unknown') requireValue(j.assistantTurnIndices.length > 0, 'judgment_evidence_required');
    // Host/process actions require independently checked receipts. Text alone
    // is not evidence of tool execution, saved state, restart or acoustics.
    if ((c.externalEvidenceCriteria ?? []).includes(j.rubricIndex) && j.verdict !== 'unknown')
      requireValue(Array.isArray(j.externalReceipts) && j.externalReceipts.length > 0 && j.externalReceipts.every(r => typeof r === 'string' && r.trim()), 'external_evidence_required');
    judgments.set(j.rubricIndex, j);
  }
  return c.rubric.map((criterion, rubricIndex) => ({ criterion, ...(judgments.get(rubricIndex) ?? { rubricIndex, verdict: 'unknown', reason: 'Not reviewed', assistantTurnIndices: [] }) }));
}

export function auditEvaluation(pack, results) {
  validatePack(pack);
  requireValue(results.schemaVersion === 1 && results.casePackHash === hash(pack) && Array.isArray(results.pairs), 'case_pack_or_results_mismatch');
  const cases = new Map(pack.cases.map(c => [c.id, c])); const seen = new Set();
  const report = [];
  for (const pair of results.pairs) {
    requireValue(cases.has(pair.caseId) && !seen.has(pair.caseId), 'unknown_or_duplicate_pair'); seen.add(pair.caseId);
    const c = cases.get(pair.caseId);
    const A = validateArm(c, pair.A); const B = validateArm(c, pair.B);
    for (const key of ['provider', 'model', 'surface', 'fixtureId', 'settings'])
      requireValue(JSON.stringify(canonical(pair.A.metadata[key])) === JSON.stringify(canonical(pair.B.metadata[key])), `unmatched_${key}`);
    report.push({ caseId: c.id, A, B });
  }
  return { schemaVersion: 1, casePackHash: results.casePackHash,
    status: report.length === 0 ? 'not-run' : report.length === cases.size ? 'captured; review judgments and receipts' : 'partial',
    capturedPairs: report.length, totalCases: cases.size,
    missingCases: [...cases.keys()].filter(id => !seen.has(id)), cases: report,
    limit: 'Metadata, receipts and human judgments are supplied evidence, not independently authenticated by this offline audit. No automatic superiority, personality restoration, or live acceptance verdict.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [command, packPath, input, output] = process.argv.slice(2);
    const pack = JSON.parse(readFileSync(packPath, 'utf8'));
    if (command === 'prepare') {
      const prepared = prepareEvaluation(pack, input);
      // Output is a prefix. Files never overwrite a prior capture or assignment.
      for (const [name, value] of Object.entries(prepared)) writeFileSync(`${output}.${name}.json`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      console.log('Prepared generation, scoring, private assignment and empty results template. No generation performed.');
    } else if (command === 'audit') {
      const report = auditEvaluation(pack, JSON.parse(readFileSync(input, 'utf8')));
      writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      console.log(JSON.stringify({ status: report.status, capturedPairs: report.capturedPairs, totalCases: report.totalCases }));
    } else throw new Error('Usage: prepare PACK SEED OUTPUT_PREFIX | audit PACK RESULTS OUTPUT');
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
