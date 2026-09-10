export type ArborAdapterFailureKind =
  | "transient"
  | "authorization"
  | "not_found"
  | "invalid_input"
  | "provider_failure"
  | "irreversible_boundary"
  | "high_consequence_boundary";

export type ArborAdapterSuccess<T> = {
  ok: true;
  value: T;
  evidence?: unknown;
};

export type ArborAdapterFailure = {
  ok: false;
  kind: ArborAdapterFailureKind;
  error: string;
  retryable: boolean;
  alternateRoutes?: string[];
  evidence?: unknown;
};

export type ArborAdapterResult<T> =
  | ArborAdapterSuccess<T>
  | ArborAdapterFailure;

export function adapterSuccess<T>(
  value: T,
  evidence?: unknown,
): ArborAdapterSuccess<T> {
  return {
    ok: true,
    value,
    evidence,
  };
}

export function adapterFailure(
  input: Omit<
    ArborAdapterFailure,
    "ok"
  >,
): ArborAdapterFailure {
  return {
    ok: false,
    ...input,
    alternateRoutes:
      Array.from(
        new Set(
          (
            input.alternateRoutes ??
            []
          )
            .map((item) =>
              item.trim(),
            )
            .filter(Boolean),
        ),
      ),
  };
}
