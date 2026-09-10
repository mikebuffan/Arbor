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
  ) {
    void this.baseUrl;
  }

  async loadState(): Promise<Record<string, unknown>> {
    return {};
  }

  async persistTurn(): Promise<void> {
    // Deliberately inert until Mike/Nox expose a stable adapter contract.
    // The control backend must not mutate their backend by accident.
  }
}
