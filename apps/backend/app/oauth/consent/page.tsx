"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type AuthorizationDetails = {
  authorization_id: string;
  redirect_url?: string;
  client: {
    id: string;
    name: string;
    uri: string;
    logo_uri: string;
  };
  user: { id: string; email: string };
  scope: string;
};

export default function OAuthConsentPage() {
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [message, setMessage] = useState("Loading authorization request…");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const authorizationId = new URLSearchParams(window.location.search).get("authorization_id");
      if (!authorizationId) {
        setMessage("This authorization request is missing its identifier.");
        return;
      }

      const supabase = supabaseBrowser();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
        window.location.assign(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error || !data) {
        setMessage(error?.message ?? "This authorization request is invalid or expired.");
        return;
      }

      if (data.redirect_url) {
        window.location.assign(data.redirect_url);
        return;
      }

      setDetails(data as AuthorizationDetails);
      setMessage("");
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function decide(decision: "approve" | "deny") {
    if (!details || busy) return;
    setBusy(true);
    setMessage("");

    const supabase = supabaseBrowser();
    const response = decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(details.authorization_id, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(details.authorization_id, { skipBrowserRedirect: true });

    if (response.error || !response.data?.redirect_url) {
      setBusy(false);
      setMessage(response.error?.message ?? "The authorization decision could not be completed.");
      return;
    }

    window.location.assign(response.data.redirect_url);
  }

  const scopes = details?.scope.split(/\s+/).filter(Boolean) ?? [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050607] px-5 py-12 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(93,220,255,.14),transparent_38%),radial-gradient(circle_at_15%_70%,rgba(84,187,145,.10),transparent_34%)]" />
      <section className="relative mx-auto mt-[6vh] max-w-lg rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 shadow-2xl backdrop-blur md:p-9">
        <div className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">Arbor / ARK</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Connect ARK to ChatGPT</h1>

        {details ? (
          <>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              <span className="font-medium text-zinc-100">{details.client.name}</span> is asking to connect to your Arbor account as <span className="text-zinc-200">{details.user.email}</span>.
            </p>

            <div className="mt-6 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4">
              <h2 className="font-medium text-emerald-100">This connection is read-only</h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400">
                <li>Read your Arbor project list.</li>
                <li>Read durable ARK objectives and task status.</li>
                <li>Read Arbor continuity for an owned project or conversation.</li>
              </ul>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                It cannot create or change tasks, memory, projects, code, deployments, or production settings.
              </p>
            </div>

            {scopes.length > 0 && (
              <div className="mt-5">
                <h2 className="text-xs uppercase tracking-[0.15em] text-zinc-600">Requested OAuth scopes</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {scopes.map((scope) => (
                    <span key={scope} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-400">{scope}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button disabled={busy} onClick={() => void decide("deny")} className="min-h-12 rounded-2xl border border-white/10 text-sm text-zinc-400 transition hover:text-zinc-100 disabled:opacity-50">
                Deny
              </button>
              <button disabled={busy} onClick={() => void decide("approve")} className="min-h-12 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.09] font-medium text-cyan-50 transition hover:bg-cyan-300/[0.14] disabled:opacity-50">
                {busy ? "Connecting…" : "Approve read-only access"}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-5 rounded-xl border border-white/[0.07] bg-black/20 p-4 text-sm leading-6 text-zinc-400">{message}</p>
        )}

        {details && message && <p className="mt-4 text-sm text-rose-300">{message}</p>}
      </section>
    </main>
  );
}
