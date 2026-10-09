/**
 * UI-only single-flight freshness gate. This does not authorize or alter
 * server-side ARK operations; it only rejects superseded readback display.
 */
export function createLatestArkStatusRequestGate() {
  let version = 0;
  let currentController: AbortController | null = null;

  return {
    begin() {
      currentController?.abort();
      const controller = new AbortController();
      currentController = controller;
      const requestVersion = ++version;
      return {
        signal: controller.signal,
        isCurrent: () => requestVersion === version && !controller.signal.aborted,
      };
    },
    invalidate() {
      ++version;
      currentController?.abort();
      currentController = null;
    },
  };
}

type RequestGate = ReturnType<typeof createLatestArkStatusRequestGate>;

export async function runLatestArkStatusRequest<T>(input: {
  gate: RequestGate;
  load: (signal: AbortSignal) => Promise<T>;
  onResolve: (value: T) => void;
  onReject: (error: unknown) => void;
  onFinally: () => void;
}): Promise<void> {
  const request = input.gate.begin();
  try {
    const result = await input.load(request.signal);
    if (request.isCurrent()) input.onResolve(result);
  } catch (error) {
    if (request.isCurrent()) input.onReject(error);
  } finally {
    if (request.isCurrent()) input.onFinally();
  }
}
