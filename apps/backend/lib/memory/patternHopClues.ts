export function patternHopClueTerms(text: string): string[] {
  const words = text.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) ?? [];
  const stop = new Set([
    "the", "and", "that", "this", "with", "from", "have", "were",
    "what", "when", "where", "into", "about", "your", "you", "but",
    "not", "for", "are", "was", "then", "they",
  ]);

  return Array.from(
    new Set(words.filter((word) => !stop.has(word.toLowerCase()))),
  ).slice(0, 10);
}

export function patternHopBranchClue(
  branch: string,
  seed: string,
  evidenceContent?: string | null,
): string {
  const body = evidenceContent ?? seed;
  const terms = patternHopClueTerms(body);

  switch (branch) {
    case "people_entities":
      return terms.filter((term) => /^[A-Z]/.test(term)).slice(0, 4).join(" ") || seed;
    case "causal_predecessors":
      return seed + " before earlier cause origin first";
    case "consequences":
      return seed + " after result consequence later";
    case "retrospective_references":
      return seed + " remember later said told you";
    case "chronology_anchors":
      return seed + " date first earliest timeline";
    case "implementation_architecture":
      return seed + " code schema backend implementation architecture";
    case "behavioral_results":
      return seed + " behavior worked failed regression recovery";
    case "terminology_changes":
      return seed + " called named term renamed";
    case "contradictions":
      return seed + " wrong correction contradiction not true";
    case "neighboring_concepts":
      return terms.slice(0, 6).join(" ") || seed;
    default:
      return seed;
  }
}
