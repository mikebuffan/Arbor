import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function badge(value: string, tone = "zinc") {
  const classes =
    tone === "emerald"
      ? "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100"
      : tone === "amber"
        ? "border-amber-300/20 bg-amber-300/[0.07] text-amber-100"
        : tone === "rose"
          ? "border-rose-300/20 bg-rose-300/[0.07] text-rose-100"
          : "border-white/10 bg-white/[0.045] text-zinc-400";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${classes}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function pct(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `${Math.round(n * 100)}%` : "—";
}

async function currentUserId() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Investigation authentication is not configured");

  const cookieStore = await cookies();
  const auth = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) redirect("/login?next=/investigation");
  return user.id;
}

export default async function InvestigationPage() {
  const userId = await currentUserId();
  const db = supabaseAdmin();

  const { data: caseRow, error: caseError } = await db
    .from("arbor_investigation_cases")
    .select("id,name,objective,status,schema_version,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (caseError) throw caseError;

  const caseId = caseRow?.id ?? null;

  const [
    sourcesRes,
    evidenceRes,
    claimsRes,
    coverageRes,
    hypothesesRes,
    findingsRes,
    edgesRes,
  ] = caseId
    ? await Promise.all([
        db
          .from("arbor_investigation_sources")
          .select("source_id,source_family_id,original_source,independence_status,acquired_at")
          .eq("user_id", userId)
          .eq("case_id", caseId)
          .order("created_at", { ascending: false })
          .limit(40),
        db
          .from("arbor_investigation_evidence_packets")
          .select("evidence_id,document_id,atomic_claim,evidence_kind,confidence,source_independence,locator,entity_resolution_state,counterevidence_state,created_at")
          .eq("user_id", userId)
          .eq("case_id", caseId)
          .order("created_at", { ascending: false })
          .limit(60),
        db
          .from("arbor_investigation_claims")
          .select("claim_id,claim_text,claim_kind,created_at")
          .eq("user_id", userId)
          .eq("case_id", caseId)
          .order("created_at", { ascending: false })
          .limit(60),
        db
          .from("arbor_investigation_coverage")
          .select("scope_id,description,status,state,updated_at")
          .eq("user_id", userId)
          .eq("case_id", caseId)
          .order("updated_at", { ascending: false })
          .limit(40),
        db
          .from("arbor_investigation_hypotheses")
          .select("hypothesis_id,statement,status,state,updated_at")
          .eq("user_id", userId)
          .eq("case_id", caseId)
          .order("updated_at", { ascending: false })
          .limit(30),
        db
          .from("arbor_investigation_findings")
          .select("finding_id,version,status,statement,evidence_ids,counterevidence_ids,entity_state,confidence,uncertainty,created_at")
          .eq("user_id", userId)
          .eq("case_id", caseId)
          .order("created_at", { ascending: false })
          .limit(40),
        db
          .from("arbor_investigation_edges")
          .select("from_id,to_id,relation,created_at")
          .eq("user_id", userId)
          .eq("case_id", caseId)
          .order("created_at", { ascending: false })
          .limit(100),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  const errors = [
    sourcesRes,
    evidenceRes,
    claimsRes,
    coverageRes,
    hypothesesRes,
    findingsRes,
    edgesRes,
  ]
    .map((result) => result.error?.message)
    .filter(Boolean);

  const sources = sourcesRes.data ?? [];
  const evidence = evidenceRes.data ?? [];
  const claims = claimsRes.data ?? [];
  const coverage = coverageRes.data ?? [];
  const hypotheses = hypothesesRes.data ?? [];
  const findings = findingsRes.data ?? [];
  const edges = edgesRes.data ?? [];

  const independent = sources.filter(
    (source) => source.independence_status === "independent",
  ).length;
  const unresolvedEntities = evidence.filter((item) => {
    const entities = Array.isArray(item.entity_resolution_state)
      ? item.entity_resolution_state
      : [];
    return entities.some((entity: any) =>
      ["unresolved", "ambiguous"].includes(String(entity?.status ?? ""))
    );
  }).length;
  const contradictions = evidence.filter((item) =>
    Array.isArray(item.counterevidence_state) &&
    item.counterevidence_state.length > 0
  ).length;

  return (
    <main className="min-h-screen bg-[#050607] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(250,80,120,.13),transparent_36%),radial-gradient(circle_at_85%_20%,rgba(84,187,145,.10),transparent_28%),linear-gradient(to_bottom,#050607,#09090b_55%,#050607)]" />
      <div className="relative mx-auto max-w-[1550px] px-5 py-8 md:px-10 md:py-12">
        <header className="mb-8 flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.34em] text-rose-300/70">
              <span className="h-px w-10 bg-rose-300/50" />
              Firefly / evidence workbench
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
              Investigation Workbench
            </h1>
            <p className="mt-4 max-w-4xl text-base leading-7 text-zinc-400 md:text-lg">
              Sources, provenance, identity state, atomic claims, contradictions,
              coverage, hypotheses, findings, and the receipts underneath them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/vault"
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 transition hover:border-white/20 hover:text-white"
            >
              Knowledge Vault
            </Link>
            {caseRow ? badge(caseRow.status, caseRow.status === "active" ? "emerald" : "zinc") : badge("no active case")}
          </div>
        </header>

        {errors.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm text-amber-100">
            Some investigation sections could not load: {errors.join(" · ")}
          </div>
        )}

        <section className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-7">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Active objective
          </div>
          <h2 className="mt-2 text-2xl font-medium">
            {caseRow?.name ?? "No case initialized"}
          </h2>
          <p className="mt-3 max-w-5xl text-sm leading-6 text-zinc-400">
            {caseRow?.objective ??
              "The workbench is ready. Corpus ingestion stays off until the frozen evidence path is approved."}
          </p>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {[
            ["Sources", sources.length],
            ["Independent", independent],
            ["Evidence", evidence.length],
            ["Claims", claims.length],
            ["Edges", edges.length],
            ["Findings", findings.length],
            ["Identity flags", unresolvedEntities],
            ["Contradictions", contradictions],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl border border-white/[0.08] bg-black/25 p-4"
            >
              <div className="text-[10px] uppercase tracking-[0.17em] text-zinc-500">
                {label}
              </div>
              <div className="mt-2 text-2xl font-medium">{value}</div>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.75fr]">
          <div className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-7">
            <div className="mb-5">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Evidence ledger
              </div>
              <h2 className="mt-1 text-2xl font-medium">Atomic receipts</h2>
            </div>
            <div className="space-y-3">
              {evidence.length === 0 && (
                <p className="text-sm leading-6 text-zinc-500">
                  Empty by design. No corpus evidence is ingested until the workbench is frozen.
                </p>
              )}
              {evidence.map((item) => {
                const locator = (item.locator ?? {}) as Record<string, unknown>;
                return (
                  <article
                    key={item.evidence_id}
                    className="rounded-2xl border border-white/[0.07] bg-black/25 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {badge(item.evidence_kind)}
                      {badge(
                        item.source_independence,
                        item.source_independence === "independent" ? "emerald" : "amber",
                      )}
                      <span className="font-mono text-[11px] text-zinc-600">
                        {item.evidence_id}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-200">
                      {item.atomic_claim}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
                      <span>confidence {pct(item.confidence)}</span>
                      <span>document {item.document_id}</span>
                      {locator.page != null && <span>page {String(locator.page)}</span>}
                      {locator.nativeLocator != null && (
                        <span className="max-w-full break-all font-mono">
                          {String(locator.nativeLocator)}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-amber-300/10 bg-amber-300/[0.035] p-5 md:p-7">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-200/60">
                Guardrails
              </div>
              <h2 className="mt-1 text-2xl font-medium">What cannot be silently promoted</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-400">
                <p>Association ≠ conduct.</p>
                <p>Allegation ≠ fact.</p>
                <p>Repeated/shared-origin reporting ≠ independent corroboration.</p>
                <p>Ambiguous identity ≠ confirmed identity.</p>
                <p>Search miss ≠ proof of absence.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-7">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Source families
              </div>
              <h2 className="mt-1 text-2xl font-medium">Independence map</h2>
              <div className="mt-4 space-y-3">
                {sources.slice(0, 18).map((source) => (
                  <div key={source.source_id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{source.original_source}</div>
                        <div className="mt-1 break-all font-mono text-[10px] text-zinc-600">
                          {source.source_family_id}
                        </div>
                      </div>
                      {badge(
                        source.independence_status,
                        source.independence_status === "independent" ? "emerald" : "zinc",
                      )}
                    </div>
                  </div>
                ))}
                {sources.length === 0 && (
                  <p className="text-sm text-zinc-500">No source families ingested yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-7">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Coverage</div>
            <h2 className="mt-1 text-2xl font-medium">What we actually searched</h2>
            <div className="mt-4 space-y-3">
              {coverage.map((entry) => (
                <div key={entry.scope_id} className="rounded-xl border border-white/[0.07] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{entry.description}</div>
                      <div className="mt-1 font-mono text-[10px] text-zinc-600">{entry.scope_id}</div>
                    </div>
                    {badge(entry.status, entry.status === "exhausted" ? "emerald" : "zinc")}
                  </div>
                </div>
              ))}
              {coverage.length === 0 && <p className="text-sm text-zinc-500">No coverage scopes recorded yet.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.09] bg-white/[0.025] p-5 md:p-7">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Hypotheses</div>
            <h2 className="mt-1 text-2xl font-medium">Things being tested, not facts</h2>
            <div className="mt-4 space-y-3">
              {hypotheses.map((h) => (
                <div key={h.hypothesis_id} className="rounded-xl border border-white/[0.07] p-3">
                  <div className="mb-2">{badge(h.status, h.status === "weakened" ? "amber" : "zinc")}</div>
                  <p className="text-sm leading-6 text-zinc-300">{h.statement}</p>
                </div>
              ))}
              {hypotheses.length === 0 && <p className="text-sm text-zinc-500">No hypotheses recorded yet.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-300/10 bg-emerald-300/[0.025] p-5 md:p-7">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/60">Findings</div>
            <h2 className="mt-1 text-2xl font-medium">Versioned conclusions</h2>
            <div className="mt-4 space-y-3">
              {findings.map((finding) => (
                <div key={`${finding.finding_id}:${finding.version}`} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {badge(finding.status, finding.status === "current" ? "emerald" : "zinc")}
                    <span className="font-mono text-[10px] text-zinc-600">v{finding.version}</span>
                    <span className="ml-auto text-[11px] text-zinc-500">{pct(finding.confidence)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{finding.statement}</p>
                </div>
              ))}
              {findings.length === 0 && <p className="text-sm text-zinc-500">No findings yet. Good. Evidence first.</p>}
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-white/[0.07] pt-5 text-xs leading-5 text-zinc-600">
          The workbench preserves provenance, identity uncertainty, source ancestry,
          counterevidence, search coverage, and historical finding versions. It is
          designed to make unsupported certainty harder, not easier.
        </footer>
      </div>
    </main>
  );
}
