"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [destination, setDestination] = useState("/");
  const router = useRouter();

  useEffect(() => {
    setDestination(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setMsg(error.message);
      return;
    }

    router.replace(destination);
    router.refresh();
  }

  async function signUp(e: React.MouseEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    setMsg(error ? error.message : "Account created. If email confirmation is enabled, check your email, then sign in.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050607] px-5 py-12 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,99,172,.15),transparent_38%),radial-gradient(circle_at_15%_70%,rgba(84,187,145,.10),transparent_34%)]" />
      <div className="relative mx-auto mt-[8vh] max-w-md rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 shadow-2xl backdrop-blur md:p-9">
        <div className="text-xs uppercase tracking-[0.32em] text-emerald-300/70">Firefly / Arbor</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Welcome back.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Sign in to continue{destination === "/vault" ? " to the private Knowledge Vault" : ""}.
        </p>

        <form onSubmit={signIn} className="mt-7 grid gap-3">
          <label className="text-xs uppercase tracking-[0.15em] text-zinc-600">Email</label>
          <input
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 outline-none transition focus:border-fuchsia-300/40"
          />
          <label className="mt-2 text-xs uppercase tracking-[0.15em] text-zinc-600">Password</label>
          <input
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 outline-none transition focus:border-fuchsia-300/40"
          />
          <button disabled={loading} type="submit" className="mt-3 min-h-12 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.09] font-medium text-fuchsia-50 transition hover:bg-fuchsia-300/[0.14] disabled:opacity-50">
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <button disabled={loading} onClick={signUp} className="min-h-11 rounded-2xl border border-white/10 text-sm text-zinc-500 transition hover:text-zinc-200 disabled:opacity-50">
            Create account
          </button>
        </form>

        {msg && <p className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 p-3 text-sm leading-6 text-zinc-400">{msg}</p>}
        {destination === "/vault" && (
          <p className="mt-5 text-xs leading-5 text-zinc-700">Vault access is separately allowlisted. An account alone does not grant access.</p>
        )}
      </div>
    </main>
  );
}
