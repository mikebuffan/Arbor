import { setProjectAnchor, getProjectAnchors } from "@/lib/memory/anchors";
import type { MemoryItem } from "@/lib/memory/types";
import { invalidatePromptCache } from "@/lib/prompt/buildPromptContext";

function mergeList(existing: string | null | undefined, addOne: string) {
  const set = new Set(
    String(existing ?? "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
  );
  set.add(addOne.trim());
  return Array.from(set).join(", ");
}

async function getExistingAnchorValue(params: {
  authedUserId: string;
  projectId: string;
  memKey: string;
}): Promise<string | null> {
  const { authedUserId, projectId, memKey } = params;

  const anchors = await getProjectAnchors({ authedUserId, projectId });
  const found = (anchors ?? []).find((a: any) => a.key === memKey);
  return found?.value ?? null;
}

export async function promoteIdentityAnchors(params: {
    authedUserId: string;
    projectId: string | null;
    userText: string;
    extracted?: MemoryItem[];
}) {
    const { authedUserId, projectId, userText, extracted = [] } = params;
    if (!projectId) return;
    let didWriteAnchor = false;

    const callMeMatch =
        userText.match(/\b(?:please\s+)?(?:just\s+)?call\s+me\s+["“]?([A-Za-z0-9][A-Za-z0-9 _\-]{0,40})["”]?\b/i) ??
        userText.match(/\byou\s+can\s+call\s+me\s+["“]?([A-Za-z0-9][A-Za-z0-9 _\-]{0,40})["”]?\b/i);

    const myNameMatch =
        userText.match(/\bmy\s+name\s+is\s+["“]?([A-Za-z0-9][A-Za-z0-9 _\-]{0,40})["”]?\b/i);

    const preferredMatch =
        userText.match(/\bpreferred\s+(?:name|address|salutation|way\s+to\s+address\s+me)\s+(?:is|=)\s+["“]?([A-Za-z0-9][A-Za-z0-9 _\-]{0,40})["”]?\b/i);

    const dontCallMeMatch =
        userText.match(/\b(?:do\s*not|don't|never)\s+call\s+me\s+["“]?([A-Za-z0-9][A-Za-z0-9 _\-]{0,40})["”]?\b/i);

    const dontUseMyName =
        /\b(?:do\s*not|don't|never)\s+(?:use|say|mention)\s+(?:my\s+name)\b/i.test(userText);

    const dontUseRealName =
        /\b(?:do\s*not|don't|never)\s+(?:use|say|mention)\s+(?:my\s+real\s+name|my\s+legal\s+name)\b/i.test(userText);

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
        didWriteAnchor = true;

        await setProjectAnchor({
            authedUserId,
            projectId,
            memKey: "user.display_name",
            memValue: preferred,
            displayText: `User display name: ${preferred}`,
            pinned: true,
            locked: true,
        });
        didWriteAnchor = true;
    }

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
        didWriteAnchor = true;
    }

    const dontCall = (dontCallMeMatch?.[1] ?? "").trim();

    if (dontCall) {
        const existing = await getExistingAnchorValue({
            authedUserId,
            projectId: projectId!,
            memKey: "user.do_not_call",
            });
        const merged = mergeList(existing, dontCall);

        await setProjectAnchor({
            authedUserId,
            projectId,
            memKey: "user.do_not_call",
            memValue: merged,
            displayText: `Do not call user: ${merged}`,
            pinned: true,
            locked: true,
        });
        didWriteAnchor = true;
    }


    if (dontUseMyName) {
        await setProjectAnchor({
            authedUserId,
            projectId,
            memKey: "user.do_not_use_name",
            memValue: "true",
            displayText: `Do not use user's name unless asked`,
            pinned: true,
            locked: true,
        });
        didWriteAnchor = true;
    }

    if (dontUseRealName) {
        await setProjectAnchor({
            authedUserId,
            projectId,
            memKey: "user.do_not_use_real_name",
            memValue: "true",
            displayText: `Do not use user's legal/real name`,
            pinned: true,
            locked: true,
        });
        didWriteAnchor = true;
    }

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
        didWriteAnchor = true;
    }
    if (didWriteAnchor) {
        try {
            invalidatePromptCache({
            authedUserId,
            projectId,
            conversationId: null,
            });
        } catch (err) {
            console.warn("[ANCHOR CACHE INVALIDATION FAILED]", {
            authedUserId,
            projectId,
            error: err instanceof Error ? err.message : err,
            });
        }
    }
}
