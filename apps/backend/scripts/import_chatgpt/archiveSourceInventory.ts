/**
 * Opt-in, metadata-only graph coverage for ChatGPT export fixtures.
 * This never imports turns, dereferences media pointers, emits content/source IDs,
 * writes a checkpoint, or changes the existing active-branch parser.
 * Using it with private export files requires separate owner/privacy approval.
 */
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type ArchiveGraphInventory = {
  graphNodes: number;
  mappedMessages: number;
  activePathNodes: number | null;
  alternateNodes: number | null;
  activeMessages: number | null;
  alternateMessages: number | null;
  activeStructuredPartMessages: number | null;
  alternateStructuredPartMessages: number | null;
  activePointerHints: number | null;
  alternatePointerHints: number | null;
  unsupportedRoleMessages: number;
  duplicateMappedMessageIds: number;
  malformedNodes: number;
  missingParentLinks: number;
  invalidParentLinks: number;
  parentCycles: number;
  activePathValid: boolean;
  graphStructureValid: boolean;
  /** Structural completeness only, NOT source-export, media or import completeness. */
  graphMetadataComplete: boolean;
  mediaBytesRead: false;
  contentBodiesReturned: false;
  writes: false;
};

export function inventoryChatGPTConversationGraph(input: unknown): ArchiveGraphInventory {
  const out: ArchiveGraphInventory = {
    graphNodes: 0, mappedMessages: 0, activePathNodes: null,
    alternateNodes: null, activeMessages: null, alternateMessages: null,
    activeStructuredPartMessages: null, alternateStructuredPartMessages: null,
    activePointerHints: null, alternatePointerHints: null,
    unsupportedRoleMessages: 0, duplicateMappedMessageIds: 0,
    malformedNodes: 0, missingParentLinks: 0, invalidParentLinks: 0,
    parentCycles: 0, activePathValid: false, graphStructureValid: false,
    graphMetadataComplete: false, mediaBytesRead: false,
    contentBodiesReturned: false, writes: false,
  };
  if (!record(input) || !record(input.mapping)) return out;
  const mapping = input.mapping;
  const nodeIds = Object.keys(mapping);
  out.graphNodes = nodeIds.length;
  const parent = new Map<string, string | null>();
  const messages = new Map<string, {structured: boolean; pointerHints: number}>();
  const messageIds = new Set<string>();

  for (const id of nodeIds) {
    const node = mapping[id];
    if (!record(node)) {out.malformedNodes++; continue;}
    const p = node.parent;
    if (p === null || p === undefined) parent.set(id, null);
    else if (typeof p !== "string" || p.length === 0) out.invalidParentLinks++;
    else if (!Object.hasOwn(mapping, p)) out.missingParentLinks++;
    else parent.set(id, p);

    if (!record(node.message)) continue;
    out.mappedMessages++;
    const message = node.message;
    if (typeof message.id === "string") {
      if (messageIds.has(message.id)) out.duplicateMappedMessageIds++;
      else messageIds.add(message.id);
    }
    const role = record(message.author) ? message.author.role : null;
    if (role !== "user" && role !== "assistant") out.unsupportedRoleMessages++;
    const parts = record(message.content) ? message.content.parts : null;
    const structured = Array.isArray(parts) && parts.some(part => typeof part !== "string");
    // Inspect only object-key presence, never pointer values or media payload bytes.
    const pointerHints = Array.isArray(parts)
      ? parts.filter(part => record(part) && Object.hasOwn(part, "asset_pointer")).length : 0;
    messages.set(id, {structured, pointerHints});
  }

  // The mapping is a one-parent graph; each node/edge is visited at most once.
  const visited = new Set<string>();
  for (const start of nodeIds) {
    if (visited.has(start)) continue;
    const seenOnPath = new Set<string>();
    let cursor: string | null = start;
    while (cursor !== null && !visited.has(cursor) && parent.has(cursor)) {
      if (seenOnPath.has(cursor)) {out.parentCycles++; break;}
      seenOnPath.add(cursor);
      cursor = parent.get(cursor) ?? null;
    }
    for (const id of seenOnPath) visited.add(id);
  }
  out.graphStructureValid = out.malformedNodes === 0 && out.missingParentLinks === 0 &&
    out.invalidParentLinks === 0 && out.parentCycles === 0;

  const current = input.current_node;
  if (typeof current !== "string" || !Object.hasOwn(mapping, current)) return out;
  const active = new Set<string>();
  let cursor: string | null = current;
  let valid = true;
  while (cursor !== null) {
    if (active.has(cursor) || !parent.has(cursor)) {valid = false; break;}
    active.add(cursor);
    cursor = parent.get(cursor) ?? null;
  }
  if (!valid) return out;
  out.activePathValid = true;
  out.activePathNodes = active.size;
  out.alternateNodes = nodeIds.length - active.size;
  out.activeMessages = 0;
  out.alternateMessages = 0;
  out.activeStructuredPartMessages = 0;
  out.alternateStructuredPartMessages = 0;
  out.activePointerHints = 0;
  out.alternatePointerHints = 0;
  for (const [id, info] of messages) {
    if (active.has(id)) {
      out.activeMessages++;
      if (info.structured) out.activeStructuredPartMessages++;
      out.activePointerHints += info.pointerHints;
    } else {
      out.alternateMessages++;
      if (info.structured) out.alternateStructuredPartMessages++;
      out.alternatePointerHints += info.pointerHints;
    }
  }
  out.graphMetadataComplete = out.graphStructureValid && out.activePathValid;
  return out;
}
