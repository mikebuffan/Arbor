export interface ArborBackendBridge {
  loadState(input: {
    projectId?: string;
    conversationId?: string;
    authorization?: string;
  }): Promise<Record<string, unknown>>;

  persistTurn(input: {
    projectId?: string;
    conversationId?: string;
    turnId: string;
    userText: string;
    assistantText: string;
    authorization?: string;
  }): Promise<void>;
}

export class MikeBackendBridge implements ArborBackendBridge {
  constructor(
    private readonly baseUrl =
      process.env.ARBOR_EXISTING_BACKEND_URL ?? "",
  ) {}

  async loadState(input: {
    projectId?: string;
    conversationId?: string;
    authorization?: string;
  }): Promise<Record<string, unknown>> {
    if (!this.baseUrl || !input.authorization) {
      return {};
    }

    const url = new URL(
      "/api/memory/items",
      this.baseUrl,
    );

    if (input.projectId) {
      url.searchParams.set(
        "projectId",
        input.projectId,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      8000,
    );

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          authorization: input.authorization,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `upstream_memory_http_${response.status}`,
        );
      }

      const body = (await response.json()) as {
        items?: unknown[];
      };

      const items = Array.isArray(body.items)
        ? body.items.slice(0, 50).map(compactMemory)
        : [];

      return {
        memory: items,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async persistTurn(): Promise<void> {
    // Deliberately inert. Mike/Nox retain ownership of backend writes.
  }
}

function compactMemory(
  raw: unknown,
): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const item = raw as Record<string, unknown>;

  return {
    key: item.key,
    value: item.value,
    tier: item.tier,
    scope: item.scope,
    importance: item.importance,
    confidence: item.confidence,
    pinned: item.pinned,
    locked: item.locked,
  };
}
