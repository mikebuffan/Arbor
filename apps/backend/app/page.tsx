"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createLatestArkStatusRequestGate, runLatestArkStatusRequest } from "@/lib/ark/latestStatusRequest";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Project = { id: string; name: string };
type Objective = { id: string; goal: string; status: string };
type Task = { status: string };
type ArkSnapshot = {
  ok: boolean; available: boolean;
  objectives: Objective[]; tasks: Task[];
  capturedAt: string;
};
function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to read the project right now.";
}
export default function Home() {
  const [identity, setIdentity] = useState<"checking" | "out" | "in">("checking");
  const [email, setEmail] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [snapshot, setSnapshot] = useState<ArkSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestGate = useRef(createLatestArkStatusRequestGate());

  useEffect(() => {
    let active = true;
    async function loadIdentity() {
      try {
        const client = supabaseBrowser();
        const { data, error: authError } = await client.auth.getUser();
        if (!active) return;
        if (authError || !data.user) { setIdentity("out"); return; }
        setEmail(data.user.email ?? "Signed-in account");
        const { data: rows, error: lookupError } = await client
          .from("projects").select("id,name")
          .eq("user_id", data.user.id)
          .order("name", { ascending: true }).limit(50);
        if (lookupError) throw lookupError;
        if (!active) return;
        const owned = (rows ?? []) as Project[];
        setProjects(owned);
        setProjectId(owned[0]?.id ?? "");
        setIdentity("in");
      } catch (cause) {
        if (!active) return;
        setIdentity("out"); setError(message(cause));
      }
    }
    void loadIdentity();
    return () => { active = false; };
  }, []);

  const refresh = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setError(""); setSnapshot(null);
    await runLatestArkStatusRequest({
      gate: requestGate.current,
      load: async (signal) => {
        const client = supabaseBrowser();
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        if (signal.aborted) throw new Error("Status request superseded.");
        if (sessionError || !session?.access_token) throw new Error("Please sign in again.");
        const response = await fetch("/api/ark/status?projectId=" + encodeURIComponent(id), {
          method: "GET",
          headers: { Authorization: "Bearer " + session.access_token },
          cache: "no-store",
          signal,
        });
        const body = (await response.json()) as ArkSnapshot & { error?: string };
        if (!response.ok || !body.ok) throw new Error(body.error ?? "ARK status is unavailable.");
        return body;
      },
      onResolve: setSnapshot,
      onReject: (cause) => setError(message(cause)),
      onFinally: () => setLoading(false),
    });
  }, []);

  useEffect(() => {
    if (identity === "in" && projectId) void refresh(projectId);
    return () => requestGate.current.invalidate();
  }, [identity, projectId, refresh]);

  const objectives = snapshot?.objectives ?? [];
  const tasks = snapshot?.tasks ?? [];
  const completed = tasks.filter(t => t.status === "completed").length;
  const card = "rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition hover:border-emerald-200/30";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070c14] text-slate-100">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_75%_10%,rgba(64,189,155,.19),transparent_38%),radial-gradient(ellipse_at_10%_80%,rgba(154,77,179,.13),transparent_42%)]" />
      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-2xl text-emerald-200">✦</span>
            <div><div className="text-lg font-semibold tracking-[.17em]">ARBOR</div><div className="text-[10px] uppercase tracking-[.25em] text-emerald-200/65">Private Preview Studio</div></div>
          </div>
          <div className="rounded-full border border-emerald-300/20 bg-emerald-400/5 px-4 py-2 text-xs text-emerald-200">Read-only ARK overview</div>
        </header>

        <section className="grid items-center gap-10 py-16 md:grid-cols-[1.3fr_.7fr] md:py-24">
          <div>
            <div className="mb-5 text-xs font-semibold uppercase tracking-[.3em] text-fuchsia-200/70">One Arbor · Protected Preview</div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-[-.05em] sm:text-6xl">One place to find <span className="text-emerald-200">Arbor.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-400">The private backend is hosted. Enter the existing conversation test, Knowledge Vault, or read your own ARK project state. This portal never starts, stops, or resumes a task.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?next=/" className="rounded-2xl bg-emerald-200 px-5 py-3 text-sm font-semibold text-[#09221b] hover:bg-emerald-100">Sign in to Arbor →</Link>
              <Link href="/vault" className="rounded-2xl border border-white/15 px-5 py-3 text-sm text-slate-200 hover:border-emerald-200/50">Knowledge Vault ↗</Link>
            </div>
          </div>
          <div aria-hidden="true" className="relative mx-auto flex h-60 w-60 items-center justify-center rounded-full border border-emerald-200/15 bg-[radial-gradient(circle,rgba(87,220,171,.15),transparent_70%)]">
            <div className="absolute h-44 w-44 rounded-full border border-emerald-200/20" />
            <span className="text-7xl text-emerald-200 drop-shadow-[0_0_30px_rgba(87,220,171,.5)]">✦</span>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/login?next=/" className={card}>
            <div className="text-xs uppercase tracking-[.22em] text-emerald-200/70">01 · Identity</div>
            <h2 className="mt-3 text-xl font-semibold">Secure sign-in</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Use your Firefly/Arbor account. Vercel access and Arbor account access are separate.</p>
            <div className="mt-6 text-sm text-emerald-200">Open sign-in ↗</div>
          </Link>
          <Link href="/debug/chat" className={card}>
            <div className="text-xs uppercase tracking-[.22em] text-fuchsia-200/70">02 · Conversation</div>
            <h2 className="mt-3 text-xl font-semibold">Text test lab</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Existing experimental chat tool. This is not the finished mobile app.</p>
            <div className="mt-6 text-sm text-fuchsia-200">Open text lab ↗</div>
          </Link>
          <Link href="/vault" className={card}>
            <div className="text-xs uppercase tracking-[.22em] text-sky-200/70">03 · Memory</div>
            <h2 className="mt-3 text-xl font-semibold">Knowledge Vault</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Private, separately allowlisted memory and provenance workspace.</p>
            <div className="mt-6 text-sm text-sky-200">Open Vault ↗</div>
          </Link>
        </div>

        <section aria-labelledby="ark-heading" className="mt-7 rounded-3xl border border-white/10 bg-white/[0.035] p-6 md:p-8">
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[.22em] text-emerald-200/70">04 · Durable state</div>
              <h2 id="ark-heading" className="mt-2 text-2xl font-semibold">ARK project status</h2>
              <p className="mt-2 text-sm text-slate-400">Owner-scoped readback only. No worker or task-control actions.</p>
            </div>
            {identity === "in" && <div className="text-xs text-slate-400">{email}</div>}
          </div>
          {identity === "checking" && <p role="status" className="mt-6 text-sm text-slate-400">Checking Arbor sign-in…</p>}
          {identity === "out" && <p className="mt-6 text-sm text-slate-300">Sign in to read your projects. <Link href="/login?next=/" className="text-emerald-200 underline underline-offset-4">Sign in</Link></p>}
          {identity === "in" && projects.length === 0 && <p className="mt-6 text-sm text-slate-400">No owned projects found. The test chat can establish a default project when you send a message.</p>}
          {identity === "in" && projects.length > 0 && (
            <>
              <div className="mt-6 flex flex-wrap items-end gap-3">
                <label className="flex min-w-52 flex-1 flex-col gap-2 text-xs text-slate-400">Your project
                  <select className="rounded-xl border border-white/15 bg-[#141e29] px-4 py-3 text-sm text-white" value={projectId} onChange={e => { requestGate.current.invalidate(); setSnapshot(null); setError(""); setLoading(false); setProjectId(e.target.value); }}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <button type="button" className="rounded-xl border border-emerald-200/30 px-5 py-3 text-sm text-emerald-100 disabled:opacity-40" disabled={loading || !projectId} onClick={() => void refresh(projectId)}>
                  {loading ? "Reading…" : "Refresh readback"}
                </button>
              </div>
              {loading && <p role="status" className="mt-5 text-sm text-slate-400">Reading your ARK records…</p>}
              {snapshot && !snapshot.available && <p className="mt-5 text-sm text-amber-200">ARK data is unavailable for this project.</p>}
              {snapshot?.available && (
                <div className="mt-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-white/[.045] p-4"><div className="text-xs text-slate-400">Recent objectives</div><div className="mt-1 text-3xl font-semibold">{objectives.length}</div></div>
                    <div className="rounded-xl bg-white/[.045] p-4"><div className="text-xs text-slate-400">Tasks in snapshot</div><div className="mt-1 text-3xl font-semibold">{tasks.length}</div></div>
                    <div className="rounded-xl bg-white/[.045] p-4"><div className="text-xs text-slate-400">Completed in snapshot</div><div className="mt-1 text-3xl font-semibold text-emerald-200">{completed}</div></div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {objectives.slice(0, 6).map(item => (
                      <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
                        <span className="max-w-2xl text-sm text-slate-200">{item.goal}</span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">{item.status.replaceAll("_", " ")}</span>
                      </div>
                    ))}
                    {objectives.length === 0 && <p className="text-sm text-slate-400">No recent ARK objectives returned for this project.</p>}
                  </div>
                  <p className="mt-4 text-xs text-slate-500">Bounded snapshot, not lifetime totals. Captured {new Date(snapshot.capturedAt).toLocaleString()}.</p>
                </div>
              )}
            </>
          )}
          {error && <p role="alert" className="mt-5 rounded-xl border border-amber-200/20 p-4 text-sm text-amber-200">{error}</p>}
        </section>
        <footer className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-500">Private Preview · Source and runtime acceptance remain separate · ARK execution is not enabled by this page</footer>
      </div>
    </main>
  );
}
