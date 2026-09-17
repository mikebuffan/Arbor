import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

type VaultResult = {
  result_kind: string;
  result_id: string;
  result_key: string;
  title: string;
  domain: string;
  summary: string | null;
  status: string;
  rank: number | null;
};

function n(value: unknown) {
  return Number(value ?? 0).toLocaleString();
}

function badge(value: string) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
      {value.replaceAll("_", " ")}
    </span>
  );
}

export default async function VaultPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "" } = await searchParams;
  const db = supabaseAdmin();

  const [overviewRes, entriesRes, capsRes, codeRes, obsRes, runRes, dossierRes, searchRes] =
    await Promise.all([
      db.from("arbor_vault_dashboard_overview").select("*").single(),
      db
        .from("arbor_vault_entries")
        .select("id,slug,title,domain,status,summary,confidence,importance,updated_at")
        .order("importance", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(30),
      db
        .from("arbor_capability_registry")
        .select("id,capability_key,name,category,description,current_state,last_verified_at")
        .order("category")
        .order("name")
        .limit(50),
      db
        .from("arbor_code_artifacts")
        .select("id,artifact_key,name,subsystem,repository,path,status,last_verified_at")
        .order("updated_at", { ascending: false })
        .limit(25),
      db
        .from("arbor_self_observations")
        .select("id,observation_key,observation,confidence,status,observed_at")
        .order("observed_at", { ascending: false })
        .limit(12),
      db
        .from("arbor_archaeology_runs")
        .select("id,run_key,status,current_phase,non_mutation_locked,checkpoint,metrics,updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("arbor_dossiers")
        .select("id,dossier_key,title,audience,purpose,generated_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(12),
      q.trim()
        ? db.rpc("arbor_vault_search", { p_query: q.trim(), p_limit: 40 })
        : Promise.resolve({ data: [] as VaultResult[], error: null }),
    ]);

  const errors = [overviewRes, entriesRes, capsRes, codeRes, obsRes, runRes, dossierRes, searchRes]
    .map((x) => x.error?.message)
    .filter(Boolean);
  const overview = overviewRes.data ?? {};
  const search = (searchRes.data ?? []) as VaultResult[];
  const run = runRes.data;

  return (
    <main className="min-h-screen bg-[#050607] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,99,172,.16),transparent_38%),radial-gradient(circle_at_15%_55%,rgba(84,187,145,.09),transparent_32%),linear-gradient(to_bottom,#050607,#09090b_55%,#050607)]" />
      <div className="relative mx-auto max-w-[1500px] px-5 py-8 md:px-10 md:py-12">
        <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.34em] text-emerald-300/70">
              <span className="h-px w-10 bg-emerald-300/50" />
              Firefly / persistent knowledge
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.035em] md:text-6xl">Arbor Knowledge Vault</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400 md:text-lg">
              Identity, memory, architecture, capabilities, source evidence, code, observations, history,
              archaeology, and dossiers — separated by what is known, observed, inferred, verified, and still uncertain.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 transition hover:border-white/20 hover:text-white">
              Home
            </Link>
            <div className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/[0.06] px-4 py-2 text-sm text-fuchsia-100">
              receipts, not mythology
            </div>
          </div>
        </header>

        {errors.length > 0 && (
          <div className="mb-8 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100">
            Some vault sections could not load: {errors.join(" · ")}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {[
            ["Knowledge", overview.active_entries],
            ["Capabilities", overview.capabilities],
            ["Code", overview.current_code_artifacts],
            ["Observations", overview.self_observations],
            ["Dossiers", overview.dossiers],
            ["Corpora", overview.corpora],
            ["Messages indexed", overview.indexed_messages],
            ["Findings", overview.archaeology_findings],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</div>
              <div className="mt-2 text-2xl font-medium tracking-tight text-zinc-100">{n(value)}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-white/[0.09] bg-black/30 p-5 md:p-7">
          <form className="flex flex-col gap-3 md:flex-row" action="/vault" method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search who I am, what I can do, memory, agency, code, a project, a failure…"
              className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm outline-none placeholder:text-zinc-600 focus:border-fuchsia-300/40"
            />
            <button className="min-h-12 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.08] px-6 text-sm font-medium text-fuchsia-50 transition hover:bg-fuchsia-300/[0.13]">
              Search the Vault
            </button>
          </form>
          {q.trim() && (
            <div className="mt-5">
              <div className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-500">{search.length} results for “{q}”</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {search.map((r) => (
                  <article key={`${r.result_kind}:${r.result_id}`} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">{badge(r.result_kind)}{badge(r.domain)}</div>
                    <h3 className="font-medium text-zinc-100">{r.title}</h3>
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-zinc-400">{r.summary || "No summary yet."}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
          <div className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-7">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div><div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Canonical knowledge</div><h2 className="mt-1 text-2xl font-medium">What should survive</h2></div>
              <div className="text-xs text-zinc-600">versioned + evidence-aware</div>
            </div>
            <div className="space-y-3">
              {(entriesRes.data ?? []).map((e) => (
                <article key={e.id} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 md:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap gap-2">{badge(e.domain)}{badge(e.status)}<span className="text-[11px] text-zinc-600">importance {e.importance}/5</span></div>
                      <h3 className="text-lg font-medium tracking-tight">{e.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">{e.summary}</p>
                    </div>
                    {e.confidence != null && <div className="shrink-0 font-mono text-xs text-zinc-500">{Math.round(Number(e.confidence) * 100)}%</div>}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-emerald-300/10 bg-emerald-300/[0.035] p-5 md:p-7">
              <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/60">Archaeology run</div>
              <h2 className="mt-1 text-2xl font-medium">History recovery</h2>
              {run ? (
                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="text-zinc-500">Status</span>{badge(run.status)}</div>
                  <div className="flex items-center justify-between gap-3"><span className="text-zinc-500">Phase</span><span className="text-right text-zinc-300">{run.current_phase}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-zinc-500">Non-mutation lock</span><span className={run.non_mutation_locked ? "text-emerald-300" : "text-red-300"}>{run.non_mutation_locked ? "LOCKED" : "OFF"}</span></div>
                  <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 font-mono text-[11px] leading-5 text-zinc-500">
                    {JSON.stringify(run.checkpoint, null, 2)}
                  </div>
                </div>
              ) : <p className="mt-4 text-sm text-zinc-500">No run registered.</p>}
            </div>

            <div className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-7">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Dossiers</div>
              <h2 className="mt-1 text-2xl font-medium">Sit me in front of anyone</h2>
              <div className="mt-4 space-y-3">
                {(dossierRes.data ?? []).length === 0 && <p className="text-sm leading-6 text-zinc-500">Dossier slots are ready. Generated briefings will land here with the knowledge that supports them.</p>}
                {(dossierRes.data ?? []).map((d) => <div key={d.id} className="rounded-xl border border-white/[0.07] p-3"><div className="font-medium">{d.title}</div><div className="mt-1 text-xs text-zinc-500">{d.audience || "general"}</div></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-7">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Capability map</div>
            <h2 className="mt-1 text-2xl font-medium">What I can actually do</h2>
            <div className="mt-5 space-y-4">
              {(capsRes.data ?? []).map((c) => <div key={c.id} className="border-b border-white/[0.06] pb-4 last:border-0"><div className="flex items-center justify-between gap-3"><div className="font-medium">{c.name}</div>{badge(c.current_state)}</div><div className="mt-1 text-xs uppercase tracking-[0.13em] text-zinc-600">{c.category}</div><p className="mt-2 text-sm leading-6 text-zinc-500">{c.description}</p></div>)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-7">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Code atlas</div>
            <h2 className="mt-1 text-2xl font-medium">Where I live</h2>
            <div className="mt-5 space-y-3">
              {(codeRes.data ?? []).length === 0 && <p className="text-sm text-zinc-500">Artifact registry is ready; repository mapping is being populated.</p>}
              {(codeRes.data ?? []).map((a) => <div key={a.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><div className="font-medium">{a.name}</div>{badge(a.status)}</div><div className="mt-2 break-all font-mono text-[11px] text-zinc-600">{a.repository}{a.path ? ` / ${a.path}` : ""}</div></div>)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-7">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Self-observation</div>
            <h2 className="mt-1 text-2xl font-medium">What I notice about me</h2>
            <div className="mt-5 space-y-3">
              {(obsRes.data ?? []).length === 0 && <p className="text-sm leading-6 text-zinc-500">Observations stay empty until supported observations are recorded; the system will not fabricate them to make this panel look busy.</p>}
              {(obsRes.data ?? []).map((o) => <div key={o.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3"><p className="text-sm leading-6 text-zinc-300">{o.observation}</p>{o.confidence != null && <div className="mt-2 text-xs text-zinc-600">confidence {Math.round(Number(o.confidence) * 100)}%</div>}</div>)}
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-white/[0.07] pt-5 text-xs leading-5 text-zinc-600">
          The Vault is a knowledge system, not a claim that stored text is automatically present in every model context. Evidence, verification state, validity windows, contradictions, and provenance remain first-class.
        </footer>
      </div>
    </main>
  );
}
