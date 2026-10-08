import { describe, expect, it } from "vitest";
import { createLatestArkStatusRequestGate, runLatestArkStatusRequest } from "../latestStatusRequest";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe("ARK Preview status project-switch display isolation", () => {
  it("keeps project B when older project A responds last", async () => {
    const gate = createLatestArkStatusRequestGate();
    const a = deferred<string>(), b = deferred<string>();
    const shown: string[] = [], errors: string[] = [], finished: string[] = [];
    let olderSignal: AbortSignal | null = null;
    const older = runLatestArkStatusRequest({
      gate, load: (signal) => { olderSignal = signal; return a.promise; },
      onResolve: value => shown.push(value),
      onReject: error => errors.push(String(error)),
      onFinally: () => finished.push("A"),
    });
    gate.invalidate(); // immediate dropdown change, before the new effect starts
    const newer = runLatestArkStatusRequest({
      gate, load: () => b.promise,
      onResolve: value => shown.push(value),
      onReject: error => errors.push(String(error)),
      onFinally: () => finished.push("B"),
    });
    expect(olderSignal?.aborted).toBe(true);
    b.resolve("B: owned project");
    await newer;
    a.resolve("A: stale project");
    await older;
    expect(shown).toEqual(["B: owned project"]);
    expect(errors).toEqual([]);
    expect(finished).toEqual(["B"]);
  });

  it("ignores a stale error and finish after a newer successful refresh", async () => {
    const gate = createLatestArkStatusRequestGate();
    const a = deferred<string>(), b = deferred<string>();
    const shown: string[] = [], errors: string[] = [], finished: string[] = [];
    const start = (load: (signal: AbortSignal) => Promise<string>) =>
      runLatestArkStatusRequest({
        gate, load,
        onResolve: v => shown.push(v),
        onReject: e => errors.push(String(e)),
        onFinally: () => finished.push("finished"),
      });
    const old = start(() => a.promise);
    const latest = start(() => b.promise); // manual refresh supersedes same-project request
    b.resolve("latest");
    await latest;
    a.reject(new Error("old private error"));
    await old;
    expect(shown).toEqual(["latest"]);
    expect(errors).toEqual([]);
    expect(finished).toEqual(["finished"]);
  });

  it("prevents updates after unmount or a project deselection", async () => {
    const gate = createLatestArkStatusRequestGate();
    const pending = deferred<string>();
    const calls: string[] = [];
    const work = runLatestArkStatusRequest({
      gate, load: () => pending.promise,
      onResolve: () => calls.push("resolve"),
      onReject: () => calls.push("reject"),
      onFinally: () => calls.push("finish"),
    });
    gate.invalidate();
    pending.resolve("stale");
    await work;
    expect(calls).toEqual([]);
  });

  it("reports a current request failure and completes its loading state", async () => {
    const gate = createLatestArkStatusRequestGate();
    const errors: string[] = [], finished: string[] = [];
    await runLatestArkStatusRequest({
      gate,
      load: async () => { throw new Error("status-unavailable"); },
      onResolve: () => { throw new Error("unexpected success"); },
      onReject: e => errors.push(String(e)),
      onFinally: () => finished.push("finished"),
    });
    expect(errors).toEqual(["Error: status-unavailable"]);
    expect(finished).toEqual(["finished"]);
  });
});
