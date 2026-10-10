"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Debug chat requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createClient(url, anonKey);
}

export default function DebugChatPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("I am feeling a little weird today.");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  // Explicitly selected disposable TEST project; never default to the
  // existing manuscript or Arbor conversation project.
  const [syntheticProjectId, setSyntheticProjectId] = useState("");
  const [syntheticDraft, setSyntheticDraft] = useState("A lantern shines in an empty fictional room.");
  const [syntheticVersion, setSyntheticVersion] = useState<number | null>(null);
  const [syntheticStatus, setSyntheticStatus] = useState("");
  const [syntheticBusy, setSyntheticBusy] = useState(false);

  // Persist across sends (this is what makes it a “thread”)
  const [projectId, setProjectId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  async function signIn() {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setReply(`Sign-in failed: ${error.message}`);
      return;
    }
    setReply(`Signed in as ${data.user?.email ?? "unknown"}`);
  }


  function newThread() {
    // Keep projectId so Arbor/framework persists, but reset conversation to start a new thread
    setConversationId(null);
    setReply("New thread started (next send will create a new conversation).");
  }

  async function send() {
    setLoading(true);
    setReply("");

    try {
      const supabase = getSupabase();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not logged in");

      // IMPORTANT: omit nulls by sending undefined instead
      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const body: Record<string, unknown> = {
        turnId: crypto.randomUUID(),
        userText: msg,
        interactionMode: "text",
      };
      if (projectId && UUID_RE.test(projectId)) body.projectId = projectId;
      if (conversationId && UUID_RE.test(conversationId)) body.conversationId = conversationId;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      // Capture IDs so the next send continues the same thread
      if (json.projectId) setProjectId(json.projectId);
      if (json.conversationId) setConversationId(json.conversationId);

      setReply(JSON.stringify(json, null, 2));
    } catch (e: any) {
      setReply(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function syntheticAction(action: "load" | "save" | "restore") {
    setSyntheticStatus("");
    setSyntheticBusy(true);
    try {
      const projectId = syntheticProjectId.trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId))
        throw new Error("Select an approved synthetic test project UUID.");
      if (action !== "load" && syntheticVersion === null)
        throw new Error("Load test state first to obtain the current version.");
      const headers = {
        authorization: `Bearer ${(await getSupabase().auth.getSession()).data.session?.access_token ?? ""}`,
        "content-type": "application/json",
      };
      const url = "/api/annabelle/workspace";
      const response = action === "load"
        ? await fetch(`${url}?projectId=${encodeURIComponent(projectId)}`, { headers, cache: "no-store" })
        : await fetch(url, { method: "POST", headers, body: JSON.stringify({
          projectId, action, requestId: crypto.randomUUID(),
          expectedVersion: syntheticVersion,
          ...(action === "save" ? { workingDelta: syntheticDraft } : {}),
        }) });
      const result = await response.json();
      if (!response.ok || !result.ok)
        throw new Error(result.error ?? "Synthetic Annabelle workspace action failed.");
      // Independent network readback is required even after a successful POST.
      const read = action === "load" ? result : await (async () => {
        const r = await fetch(`${url}?projectId=${encodeURIComponent(projectId)}`, {
          headers, cache: "no-store",
        });
        const v = await r.json();
        if (!r.ok || !v.ok) throw new Error(v.error ?? "Synthetic readback failed.");
        return v;
      })();
      if (action === "save" && read.workspace?.workingDelta !== syntheticDraft)
        throw new Error("Synthetic draft save-readback mismatch.");
      if (action !== "load" && read.editVersion !== result.editVersion)
        throw new Error("Synthetic workspace version readback mismatch.");
      if (!Number.isSafeInteger(read.editVersion))
        throw new Error("Synthetic workspace version missing.");
      setSyntheticVersion(read.editVersion);
      setSyntheticDraft(read.workspace?.workingDelta ?? "");
      setSyntheticStatus(action === "load" ? "Synthetic draft loaded." :
        action === "save" ? "Synthetic draft saved and independently verified." :
        "Synthetic previous revision restored and verified.");
    } catch (error) {
      setSyntheticStatus(error instanceof Error ? error.message : "Synthetic workspace unavailable.");
    } finally {
      setSyntheticBusy(false);
    }
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui", maxWidth: 900 }}>
      <h1>Debug Chat</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
        <button onClick={signIn} disabled={loading}>Sign in</button>
        <button onClick={newThread} disabled={loading}>New thread</button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
        <div>projectId: {projectId ?? "(null: server will create/use Default Project)"}</div>
        <div>conversationId: {conversationId ?? "(null: next send creates new conversation)"}</div>
      </div>

      <textarea
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        rows={4}
        style={{ width: "100%", padding: 8 }}
      />

      <button onClick={send} disabled={loading} style={{ marginTop: 8 }}>
        {loading ? "Sending..." : "Send"}
      </button>

      <pre style={{ marginTop: 16, padding: 12, background: "#111", color: "#0f0", overflowX: "auto" }}>
        {reply}
      </pre>
      <section aria-label="Annabelle synthetic editor test" style={{ marginTop: 24, borderTop: "1px solid #888", paddingTop: 16 }}>
        <h2>Annabelle — disposable draft acceptance</h2>
        <p>Test-only, disabled by default. Do not select an Ever After manuscript project.</p>
        <label>Approved synthetic project ID:{" "}
          <input value={syntheticProjectId} onChange={e => {
            setSyntheticProjectId(e.target.value);
            setSyntheticVersion(null);
            setSyntheticStatus("");
          }} placeholder="Disposable project UUID" style={{ width: 310 }} />
        </label>
        <p>Stored version: {syntheticVersion === null ? "Not loaded" : syntheticVersion}</p>
        <textarea aria-label="Synthetic writing draft" value={syntheticDraft}
          onChange={e => setSyntheticDraft(e.target.value)} maxLength={100000}
          rows={7} style={{ width: "100%", padding: 8 }} />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button disabled={syntheticBusy} onClick={() => void syntheticAction("load")}>Load test draft</button>
          <button disabled={syntheticBusy || syntheticVersion === null}
            onClick={() => void syntheticAction("save")}>Save and verify</button>
          <button disabled={syntheticBusy || syntheticVersion === null}
            onClick={() => void syntheticAction("restore")}>Restore previous</button>
        </div>
        {syntheticStatus && <p role="status">{syntheticStatus}</p>}
      </section>
    </div>
  );
}
