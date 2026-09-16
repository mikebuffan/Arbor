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

function hopBase(seed: string, evidenceContent?: string | null): string {
  const seedAnchor = patternHopClueTerms(seed).slice(0, 3).join(" ");
  const evidence = (evidenceContent ?? seed).replace(/\s+/g, " ").trim().slice(0, 700);
  return [evidence, seedAnchor].filter(Boolean).join(" ");
}

export function patternHopBranchClue(
  branch: string,
  seed: string,
  evidenceContent?: string | null,
): string {
  const base = hopBase(seed, evidenceContent);
  const terms = patternHopClueTerms(base);

  switch (branch) {
    case "people_entities":
      return (
        terms.filter((term) => /^[A-Z]/.test(term)).slice(0, 4).join(" ") ||
        base
      );
    case "causal_predecessors":
      return base + " before earlier cause origin first predecessor";
    case "consequences":
      return base + " after result consequence later outcome";
    case "retrospective_references":
      return base + " remember later said told you retrospective";
    case "chronology_anchors":
      return base + " date first earliest timeline before after";
    case "implementation_architecture":
      return base + " code schema backend implementation architecture migration runtime";
    case "behavioral_results":
      return base + " behavior worked failed regression recovery demonstration result";
    case "terminology_changes":
      return base + " called named term renamed earlier wording";
    case "contradictions":
      return base + " wrong correction contradiction not true superseded";
    case "neighboring_concepts":
      return terms.slice(0, 8).join(" ") || base;
    default:
      return base;
  }
}
