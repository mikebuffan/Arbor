import {
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";

import type {
  ArborConversationMessage,
  ArborState,
  StoredArborTurn,
} from "./types.js";

type DiskState = {
  states: Record<string, ArborState>;
  turns: Record<string, StoredArborTurn>;
  history: Record<string, string[]>;
};

export interface ArborStateStore {
  load(scope: string): Promise<ArborState | null>;
  save(scope: string, state: ArborState): Promise<void>;
  loadTurn(turnId: string): Promise<StoredArborTurn | null>;
  saveTurn(turn: StoredArborTurn): Promise<void>;
  commitTurn(
    scope: string,
    state: ArborState,
    turn: StoredArborTurn,
  ): Promise<void>;
  recentMessages(
    scope: string,
    limitTurns?: number,
  ): Promise<ArborConversationMessage[]>;
}

export class JsonFileArborStateStore implements ArborStateStore {
  private writeTail: Promise<void> = Promise.resolve();

  constructor(
    private readonly file =
      process.env.ARBOR_STATE_FILE ?? ".arbor-control/state.json",
  ) {}

  async load(scope: string): Promise<ArborState | null> {
    await this.waitForWrites();
    const db = await this.readUnlocked();
    return db.states[scope] ?? null;
  }

  async save(
    scope: string,
    state: ArborState,
  ): Promise<void> {
    return this.enqueueMutation((db) => {
      db.states[scope] = structuredClone(state);
    });
  }

  async loadTurn(turnId: string): Promise<StoredArborTurn | null> {
    await this.waitForWrites();
    const db = await this.readUnlocked();
    return db.turns[turnId] ?? null;
  }

  async saveTurn(turn: StoredArborTurn): Promise<void> {
    return this.enqueueMutation((db) => {
      this.putTurn(db, turn);
    });
  }

  async commitTurn(
    scope: string,
    state: ArborState,
    turn: StoredArborTurn,
  ): Promise<void> {
    return this.enqueueMutation((db) => {
      db.states[scope] = structuredClone(state);
      this.putTurn(db, turn);
    });
  }

  async recentMessages(
    scope: string,
    limitTurns = 12,
  ): Promise<ArborConversationMessage[]> {
    await this.waitForWrites();
    const db = await this.readUnlocked();
    const ids = (db.history[scope] ?? []).slice(
      -Math.max(1, Math.min(limitTurns, 50)),
    );

    const messages: ArborConversationMessage[] = [];

    for (const turnId of ids) {
      const turn = db.turns[turnId];
      if (!turn) continue;

      messages.push(
        {
          role: "user",
          content: turn.userText,
        },
        {
          role: "assistant",
          content: turn.response.text,
        },
      );
    }

    return messages;
  }

  private putTurn(
    db: DiskState,
    turn: StoredArborTurn,
  ): void {
    const existing = db.turns[turn.turnId];

    if (
      existing &&
      existing.requestFingerprint !== turn.requestFingerprint
    ) {
      throw new Error("turn_id_conflict");
    }

    db.turns[turn.turnId] = structuredClone(turn);

    const ids = db.history[turn.scope] ?? [];

    if (!ids.includes(turn.turnId)) {
      db.history[turn.scope] = [
        ...ids,
        turn.turnId,
      ].slice(-5000);
    }
  }

  private async enqueueMutation(
    mutate: (db: DiskState) => Promise<void> | void,
  ): Promise<void> {
    const operation = this.writeTail.then(async () => {
      const db = await this.readUnlocked();
      await mutate(db);
      await this.writeAtomic(db);
    });

    this.writeTail = operation.then(
      () => undefined,
      () => undefined,
    );

    return operation;
  }

  private async waitForWrites(): Promise<void> {
    await this.writeTail;
  }

  private async readUnlocked(): Promise<DiskState> {
    try {
      const parsed = JSON.parse(
        await readFile(this.file, "utf8"),
      ) as Partial<DiskState>;

      return {
        states: parsed.states ?? {},
        turns: parsed.turns ?? {},
        history: parsed.history ?? {},
      };
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return {
          states: {},
          turns: {},
          history: {},
        };
      }

      throw error;
    }
  }

  private async writeAtomic(state: DiskState): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });

    const tempFile =
      `${this.file}.${process.pid}.${crypto.randomUUID()}.tmp`;

    try {
      await writeFile(
        tempFile,
        JSON.stringify(state, null, 2),
        "utf8",
      );

      await rename(tempFile, this.file);
    } finally {
      await unlink(tempFile).catch(() => undefined);
    }
  }
}

export function stateScope(input: {
  projectId?: string;
  conversationId?: string;
}): string {
  return input.projectId?.trim()
    ? `project:${input.projectId.trim()}`
    : input.conversationId?.trim()
      ? `conversation:${input.conversationId.trim()}`
      : "default";
}
