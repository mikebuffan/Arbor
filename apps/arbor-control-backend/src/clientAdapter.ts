import type {
  ArborChannel,
  CanonicalArborResponse,
} from "./types.js";

export type ArborClientScope = {
  projectId?: string;
  conversationId?: string;
};

export type ArborControlClientOptions = {
  baseUrl: string;
  controlToken: string;
  fetchImpl?: typeof fetch;
};

export class ArborControlClient {
  private readonly fetchImpl:
    typeof fetch;

  constructor(
    private readonly options:
      ArborControlClientOptions,
  ) {
    this.fetchImpl =
      options.fetchImpl ??
      fetch;
  }

  async sendText(
    userText:
      string,

    scope:
      ArborClientScope = {},
  ):
    Promise<
      CanonicalArborResponse
    > {
    return this.sendTurn(
      userText,
      "text",
      scope,
    );
  }

  async sendVoice(
    userText:
      string,

    scope:
      ArborClientScope = {},
  ):
    Promise<{
      turn:
        CanonicalArborResponse;

      audio:
        ArrayBuffer;
    }> {
    const turn =
      await this.sendTurn(
        userText,
        "voice",
        scope,
      );

    const response =
      await this.fetchImpl(
        this.url(
          `/v1/voice/${encodeURIComponent(
            turn.turnId,
          )}`,
        ),
        {
          method:
            "GET",

          headers:
            this.headers(),
        },
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `arbor_voice_http_${response.status}`,
      );
    }

    return {
      turn,

      audio:
        await response
          .arrayBuffer(),
    };
  }

  async enterAnnabelle(
    scope:
      ArborClientScope = {},
  ):
    Promise<
      CanonicalArborResponse
    > {
    return this.sendTurn(
      "Annabelle, kitchen's yours.",
      "text",
      scope,
    );
  }

  async returnToArbor(
    scope:
      ArborClientScope = {},
  ):
    Promise<
      CanonicalArborResponse
    > {
    return this.sendTurn(
      "Arbor, kitchen's yours.",
      "text",
      scope,
    );
  }

  private async sendTurn(
    userText:
      string,

    channel:
      ArborChannel,

    scope:
      ArborClientScope,
  ):
    Promise<
      CanonicalArborResponse
    > {
    const response =
      await this.fetchImpl(
        this.url(
          "/v1/turn",
        ),
        {
          method:
            "POST",

          headers: {
            ...this.headers(),

            "content-type":
              "application/json",
          },

          body:
            JSON.stringify({
              userText,
              channel,
              ...scope,
            }),
        },
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `arbor_turn_http_${response.status}`,
      );
    }

    const body =
      await response
        .json() as
        CanonicalArborResponse & {
          ok?: boolean;
        };

    return {
      text:
        body.text,

      projectId:
        body.projectId,

      conversationId:
        body.conversationId,

      turnId:
        body.turnId,

      subsystem:
        body.subsystem,

      channel:
        body.channel,

      voice:
        body.voice,
    };
  }

  private headers():
    Record<
      string,
      string
    > {
    return {
      authorization:
        `Bearer ${this.options.controlToken}`,
    };
  }

  private url(
    path:
      string,
  ): string {
    return `${
      this.options.baseUrl
        .replace(
          /\/+$/,
          "",
        )
    }${path}`;
  }
}
