import { setProjectAnchor } from "@/lib/memory/anchors";
import type { MemoryItem } from "@/lib/memory/types";

export async function promoteIdentityAnchors(params: {
  authedUserId: string;
  projectId: string | null;
  userText: string;
  extracted?: MemoryItem[];
}) {
  const { authedUserId, projectId, userText, extracted = [] } = params;
  if (!projectId) return;

  // ---------- 1) Regex-based (authoritative) ----------
  const callMeMatch =
    userText.match(/\b(?:please\s+)?(?:just\s+)?call\s+me\s+["“]?([A-Za-z0-9][A-Za-z0-9 _\-]{0,40})["”]?\b/i) ??
    userText.match(/\byou\s+can\s+call\s+me\s+["“]?([A-Za-z0-9][A-Za-z0-9 _\-]{0,40})["”]?\b/i);

  const myNameMatch =
    userText.match(/\bmy\s+name\s+is\s+["“]?([A-Za-z0-9][A-Za-z0-9 _\-]{0,40})["”]?\b/i);

  const preferredMatch =
    userText.match(/\bpreferred\s+(?:name|address|salutation|way\s+to\s+address\s+me)\s+(?:is|=)\s+["“]?([A-Za-z0-9][A-Za-z0-9 _\-]{0,40})["”]?\b/i);

  const preferred =
    (preferredMatch?.[1] ?? callMeMatch?.[1] ?? "").trim();

  const legalOrGiven =
    (myNameMatch?.[1] ?? "").trim();

  if (preferred) {
    await setProjectAnchor({
      authedUserId,
      projectId,
      memKey: "user.preferred_address",
      memValue: preferred,
      displayText: `Preferred address: ${preferred}`,
      pinned: true,
      locked: true,
    });

    await setProjectAnchor({
      authedUserId,
      projectId,
      memKey: "user.display_name",
      memValue: preferred,
      displayText: `User display name: ${preferred}`,
      pinned: true,
      locked: true,
    });
  }

  // If they gave a legal/given name, store it too (separately)
  if (legalOrGiven) {
    await setProjectAnchor({
      authedUserId,
      projectId,
      memKey: "user.legal_name",
      memValue: legalOrGiven,
      displayText: `User legal/given name: ${legalOrGiven}`,
      pinned: false,
      locked: true,
    });
  }

  // ---------- 2) Extracted item scan (fallback) ----------
  const keyToAnchor: Record<string, string> = {
    "preferences.preferred_address": "user.preferred_address",
    "preferences.preferred_name": "user.preferred_address",
    "identity.preferred_name": "user.preferred_address",
    "user.preferred_name": "user.preferred_address",
    "user.display_name": "user.display_name",
  };

  for (const it of extracted) {
    const k = (it.key ?? "").trim();
    if (!k) continue;

    const anchorKey = keyToAnchor[k];
    if (!anchorKey) continue;

    const raw = (it.value as any)?.value ?? it.value;
    const val = String(raw ?? "").trim();
    if (!val) continue;

    await setProjectAnchor({
      authedUserId,
      projectId,
      memKey: anchorKey,
      memValue: val,
      displayText:
        anchorKey === "user.preferred_address"
          ? `Preferred address: ${val}`
          : `User display name: ${val}`,
      pinned: true,
      locked: true,
    });
  }
}
