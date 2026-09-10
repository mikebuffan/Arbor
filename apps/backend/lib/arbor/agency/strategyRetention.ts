const PENDING_PREFIX = "__arbor_pending_strategy_v1__:";

export type StrategyRetentionState = {
  retained: string[];
  pending: {
    strategy: string;
    confirmations: number;
  } | null;
};

function encodePending(input: {
  strategy: string;
  confirmations: number;
}): string {
  return PENDING_PREFIX + JSON.stringify(input);
}

function decodePending(
  value: string,
): StrategyRetentionState["pending"] {
  if (!value.startsWith(PENDING_PREFIX)) return null;

  try {
    const parsed = JSON.parse(
      value.slice(PENDING_PREFIX.length),
    );

    if (
      typeof parsed?.strategy !== "string" ||
      typeof parsed?.confirmations !== "number"
    ) {
      return null;
    }

    return {
      strategy: parsed.strategy.trim(),
      confirmations: Math.max(
        1,
        Math.floor(parsed.confirmations),
      ),
    };
  } catch {
    return null;
  }
}

export function readStrategyRetention(
  notes: string[],
): StrategyRetentionState {
  const retained: string[] = [];
  let pending: StrategyRetentionState["pending"] = null;

  for (const note of notes) {
    const decoded = decodePending(note);

    if (decoded) {
      pending = decoded;
    } else if (note.trim()) {
      retained.push(note.trim());
    }
  }

  return {
    retained: Array.from(new Set(retained)).slice(-20),
    pending,
  };
}

export function recordStrategyCandidate(
  notes: string[],
  candidate: string,
): {
  notes: string[];
  disposition: "pending" | "retained";
} {
  const strategy = candidate.trim();

  if (!strategy) {
    return {
      notes,
      disposition: "pending",
    };
  }

  const current = readStrategyRetention(notes);

  if (current.pending?.strategy === strategy) {
    return {
      notes: [...current.retained, strategy].slice(-20),
      disposition: "retained",
    };
  }

  return {
    notes: [
      ...current.retained,
      encodePending({
        strategy,
        confirmations: 1,
      }),
    ].slice(-20),
    disposition: "pending",
  };
}

export function strategyContext(
  notes: string[],
): {
  retained: string[];
  pending: string[];
} {
  const state = readStrategyRetention(notes);

  return {
    retained: state.retained,
    pending: state.pending ? [state.pending.strategy] : [],
  };
}
