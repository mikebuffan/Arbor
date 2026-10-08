"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type State = "checking" | "ready" | "invalid" | "complete";

export default function ResetPasswordPage() {
  const [state, setState] = useState<State>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const client = supabaseBrowser();
    const url = new URL(window.location.href);
    const hasRecoveryLink = url.hash.includes("type=recovery") ||
      url.searchParams.has("code") || url.searchParams.get("type") === "recovery";

    const { data: { subscription } } = client.auth.onAuthStateChange(event => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setState("ready");
    });

    async function acceptRecovery() {
      try {
        const { data: initial, error: initialError } = await client.auth.getSession();
        if (initialError) throw initialError;
        let session = initial.session;
        if (!session && url.searchParams.has("code")) {
          const { data: exchanged, error: exchangeError } =
            await client.auth.exchangeCodeForSession(url.searchParams.get("code")!);
          if (exchangeError) throw exchangeError;
          session = exchanged.session;
        }
        if (!active) return;
        // Only after auth processes the callback: remove tokens from the visible URL.
        if (hasRecoveryLink) window.history.replaceState(null, "", "/reset-password");
        if (session && hasRecoveryLink) setState("ready");
        else setState(current => current === "ready" ? current : "invalid");
      } catch {
        if (!active) return;
        window.history.replaceState(null, "", "/reset-password");
        setState(current => current === "ready" ? current : "invalid");
      }
    }
    void acceptRecovery();
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function finishReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 12) {
      setError("Choose a password of at least 12 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const client = supabaseBrowser();
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirmation("");
      setState("complete");
      // End only this browser's recovery session. Do not revoke other devices.
      await client.auth.signOut({ scope: "local" });
    } catch {
      if (state !== "complete") setError("Couldn't change the password. Request a fresh recovery link and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070c14] px-5 py-12 text-slate-100">
      <div className="mx-auto mt-[8vh] max-w-md rounded-[2rem] border border-emerald-200/15 bg-white/[0.035] p-7 shadow-xl md:p-9">
        <div className="text-xs uppercase tracking-[.28em] text-emerald-200/70">Firefly / Arbor · Private Preview</div>
        <h1 className="mt-3 text-3xl font-semibold">Reset your password</h1>
        {state === "checking" && <p role="status" className="mt-5 text-sm text-slate-400">Verifying your recovery link…</p>}
        {state === "invalid" && (
          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <p>The recovery link is missing, expired, or was already used. Return to Arbor sign-in and request a new one.</p>
            <p>Do not reuse a recovery link shown in a screenshot.</p>
            <Link href="/login?next=/" className="inline-block rounded-xl border border-emerald-200/30 px-4 py-3 text-emerald-200">Back to sign-in →</Link>
          </div>
        )}
        {state === "ready" && (
          <form onSubmit={finishReset} className="mt-6 grid gap-3">
            <p className="mb-1 text-sm leading-6 text-slate-400">Your recovery link was accepted. Choose a new password for your existing Arbor Preview account.</p>
            <label htmlFor="new-password" className="text-xs uppercase tracking-wider text-slate-300">New password</label>
            <input id="new-password" type="password" required minLength={12} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
              className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-4 outline-none focus:border-emerald-200/50" />
            <label htmlFor="confirm-password" className="mt-1 text-xs uppercase tracking-wider text-slate-300">Confirm new password</label>
            <input id="confirm-password" type="password" required minLength={12} autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)}
              className="min-h-12 rounded-xl border border-white/15 bg-black/20 px-4 outline-none focus:border-emerald-200/50" />
            {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
            <button type="submit" disabled={busy} className="mt-3 min-h-12 rounded-xl bg-emerald-200 font-semibold text-[#0a231b] disabled:opacity-50">
              {busy ? "Updating…" : "Save new password"}
            </button>
          </form>
        )}
        {state === "complete" && (
          <div role="status" className="mt-5 space-y-4 text-sm text-slate-300">
            <p>Password updated. Your existing Arbor account and project records were preserved.</p>
            <Link href="/login?next=/" className="inline-block rounded-xl bg-emerald-200 px-4 py-3 font-semibold text-[#09221b]">Sign in with new password →</Link>
          </div>
        )}
      </div>
    </main>
  );
}
