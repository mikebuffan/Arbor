const PENDING_PREFIX = "__arbor_pending_strategy_v1__:";
const REQUIRED_CONFIRMATIONS = 2;

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

    const strategy = parsed.strategy.trim();
    if (!strategy) return null;

    return {
      strategy,
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
    if (note.startsWith(PENDING_PREFIX)) {
      const decoded = decodePending(note);

      if (decoded) {
        pending = decoded;
      }

      continue;
    }

    if (note.trim()) {
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
  const current = readStrategyRetention(notes);

  if (!strategy) {
    return {
      notes: [
        ...current.retained,
        ...(current.pending
          ? [encodePending(current.pending)]
          : []),
      ].slice(-20),
      disposition: "pending",
    };
  }

  if (current.retained.includes(strategy)) {
    return {
      notes: current.retained,
      disposition: "retained",
    };
  }

  if (current.pending?.strategy === strategy) {
    const confirmations =
      current.pending.confirmations + 1;

    if (confirmations >= REQUIRED_CONFIRMATIONS) {
      return {
        notes: Array.from(
          new Set([
            ...current.retained,
            strategy,
          ]),
        ).slice(-20),
        disposition: "retained",
      };
    }

    return {
      notes: [
        ...current.retained,
        encodePending({
          strategy,
          confirmations,
        }),
      ].slice(-20),
      disposition: "pending",
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
    pending: state.pending
      ? [state.pending.strategy]
      : [],
  };
}

export function retainStrategy(
  notes: string[],
  strategy: string,
): string[] {
  const current = readStrategyRetention(notes);
  const value = strategy.trim();

  if (!value) {
    return current.retained;
  }

  return Array.from(
    new Set([
      ...current.retained,
      value,
    ]),
  ).slice(-20);
}
