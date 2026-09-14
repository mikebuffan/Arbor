import type {
  ArborCorrection,
  ArborRuntimeState,
} from "../runtime/runtimeState";

function normalized(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function uniqueRecent(
  values: string[],
  max = 20,
): string[] {
  const seen =
    new Set<string>();

  const result: string[] =
    [];

  for (
    let index =
      values.length - 1;
    index >= 0;
    index -= 1
  ) {
    const value =
      normalized(
        values[index] ?? "",
      );

    if (
      !value ||
      seen.has(value)
    ) {
      continue;
    }

    seen.add(value);
    result.push(value);

    if (
      result.length >= max
    ) {
      break;
    }
  }

  return result.reverse();
}

export function prioritizeCorrections(
  corrections: ArborCorrection[],
  max = 20,
): ArborCorrection[] {
  const bySemanticValue =
    new Map<
      string,
      ArborCorrection
    >();

  const ordered = [
    ...corrections,
  ].sort(
    (a, b) =>
      b.observedAt.localeCompare(
        a.observedAt,
      ),
  );

  for (
    const correction of ordered
  ) {
    const value =
      normalized(
        correction.value,
      );

    if (!value) continue;

    const key =
      `${correction.kind}:${value.toLowerCase()}`;

    if (
      bySemanticValue.has(key)
    ) {
      continue;
    }

    bySemanticValue.set(
      key,
      {
        ...correction,
        value,
      },
    );

    if (
      bySemanticValue.size >= max
    ) {
      break;
    }
  }

  return Array.from(
    bySemanticValue.values(),
  );
}

export function projectRuntimeMemory(
  runtime:
    ArborRuntimeState,
) {
  return {
    currentGoal:
      runtime.currentGoal,
    lastMeaningfulUserTurn:
      runtime
        .lastMeaningfulUserTurn,
    lastMeaningfulArborTurn:
      runtime
        .lastMeaningfulArborTurn,
    unresolvedWork:
      uniqueRecent(
        runtime.agency
          ?.unresolvedWork ??
          [],
      ),
    recurringWeaknesses:
      uniqueRecent(
        runtime.agency
          ?.recurringWeaknesses ??
          [],
      ),
    retainedStrategies:
      uniqueRecent(
        runtime.agency
          ?.strategyNotes ??
          [],
      ),
    corrections:
      prioritizeCorrections(
        runtime.corrections,
      ).map(
        (item) => ({
          id: item.id,
          kind: item.kind,
          value:
            item.value,
          observedAt:
            item.observedAt,
          confidence:
            item.confidence,
          protected:
            item.protected,
        }),
      ),
    pendingSelfUpdate:
      runtime
        .pendingSelfUpdate
        ? {
            id:
              runtime
                .pendingSelfUpdate
                .id,
            strategy:
              runtime
                .pendingSelfUpdate
                .strategy,
            verificationCount:
              runtime
                .pendingSelfUpdate
                .verificationCount,
            beforeScore:
              runtime
                .pendingSelfUpdate
                .beforeScore,
            afterScore:
              runtime
                .pendingSelfUpdate
                .afterScore,
            updatedAt:
              runtime
                .pendingSelfUpdate
                .updatedAt,
          }
        : null,
    runtimeUpdatedAt:
      runtime.updatedAt,
  };
}
