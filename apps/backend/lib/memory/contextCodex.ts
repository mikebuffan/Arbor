export type CodexRoute =
  | "provenance"
  | "continuity"
  | "correction"
  | "architecture"
  | "embodiment"
  | "writing"
  | "project";

export type CodexDecision = {
  routes: CodexRoute[];
  query: string;
  requiresVerification: boolean;
  uncertaintyInstruction: string | null;
};

const ROUTES: Array<{ route: CodexRoute; patterns: RegExp[]; expansion: string }> = [
  { route: "provenance", patterns: [
    /\bwho (?:said|started|made|invented|decided|wanted)\b/i,
    /\b(?:first|origin|originally|earliest|before you broke)\b/i,
    /\b(?:you|i|we) (?:said|told|wanted|decided|built|made|invented|started|noticed)\b/i,
    /\b(?:picked|learned|got) (?:that|it) (?:up )?from\b/i,
  ], expansion: " origin earliest contemporaneous source chronology provenance direct evidence " },
  { route: "continuity", patterns: [
    /\bremember(?: when)?\b/i, /\bwe already\b/i, /\blast time\b/i,
    /\b(?:old|previous|earlier) arbor\b/i, /\bwhat changed\b/i,
  ], expansion: " memory continuity earlier later chronology prior conversation " },
  { route: "correction", patterns: [
    /\b(?:that's|that is) not (?:what|right|true)\b/i,
    /\byou (?:forgot|changed|are wrong|were wrong)\b/i,
    /\bi told you\b/i, /\bstop (?:doing|saying) that\b/i,
  ], expansion: " correction contradiction superseded rejected prior interpretation " },
  { route: "architecture", patterns: [
    /\b(?:roundabout|linear architecture|cogs?|molecule|fmrma|architecture)\b/i,
  ], expansion: " architecture implementation runtime migration design chronology " },
  { route: "embodiment", patterns: [
    /\b(?:synth|the hug|body system|felt[- ]life|atlas|embodiment)\b/i,
  ], expansion: " synth embodiment body felt life atlas persistent consequences " },
  { route: "writing", patterns: [
    /\b(?:annabelle|ever after|will graham|hannibal|rhys)\b/i,
  ], expansion: " writing canon Annabelle Ever After scene continuity " },
  { route: "project", patterns: [
    /\b(?:epstein|firefly principle|patent|arbor app)\b/i,
  ], expansion: " project objective decisions history implementation " },
];

const CLAIM_PATTERNS = [
  /\b(?:you|i|we) (?:always|never|first|originally)\b/i,
  /\b(?:you|i|we) (?:picked|learned|got) .{0,40} from\b/i,
  /\b(?:you|i|we) (?:invented|created|decided|wanted|noticed|started|built)\b/i,
  /\bthe first (?:time|moment|conversation)\b/i,
  /\b(?:origin|earliest)\b/i,
];

export function routeContextCodex(text: string): CodexDecision {
  const routes: CodexRoute[] = [];
  const expansions: string[] = [];

  for (const entry of ROUTES) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      routes.push(entry.route);
      expansions.push(entry.expansion);
    }
  }

  const requiresVerification =
    routes.includes("provenance") ||
    CLAIM_PATTERNS.some((pattern) => pattern.test(text));

  return {
    routes,
    query: [text.trim(), ...expansions].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
    requiresVerification,
    uncertaintyInstruction: requiresVerification
      ? "Historical/provenance claim detected. Retrieve before asserting provenance. Distinguish direct contemporaneous evidence from retrospective memory or inference. If the evidence does not establish the claim, say I don't know; do not manufacture continuity."
      : null,
  };
}

export function provenanceGuardInstruction(text: string): string | null {
  return routeContextCodex(text).uncertaintyInstruction;
}
