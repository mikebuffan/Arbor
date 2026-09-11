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
  ArborScopeSnapshot,
  ArborState,
  StoredArborTurn,
} from "./types.js";

type DiskState = {
  states: Record<string, ArborState>;
  turns: Record<string, StoredArborTurn>;
  history: Record<string, string[]>;
};

export type ArborStateMutationResult<T> = {
  state: ArborState;
  result: T;
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
  mutate<T>(
    scope: string,
    mutate: (
      current: ArborState | null,
    ) => ArborStateMutationResult<T> | Promise<ArborStateMutationResult<T>>,
  ): Promise<T>;
  exportScope(
    scope: string,
  ): Promise<ArborScopeSnapshot>;
  importScope(
    snapshot: ArborScopeSnapshot,
  ): Promise<void>;
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
    await this.enqueueMutation((db) => {
      db.states[scope] = structuredClone(state);
    });
  }

  async loadTurn(turnId: string): Promise<StoredArborTurn | null> {
    await this.waitForWrites();
    const db = await this.readUnlocked();
    return db.turns[turnId] ?? null;
  }

  async saveTurn(turn: StoredArborTurn): Promise<void> {
    await this.enqueueMutation((db) => {
      this.putTurn(db, turn);
    });
  }

  async commitTurn(
    scope: string,
    state: ArborState,
    turn: StoredArborTurn,
  ): Promise<void> {
    await this.enqueueMutation((db) => {
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

  async mutate<T>(
    scope: string,
    mutate: (
      current: ArborState | null,
    ) => ArborStateMutationResult<T> | Promise<ArborStateMutationResult<T>>,
  ): Promise<T> {
    return this.enqueueMutation(async (db) => {
      const current =
        db.states[scope] ?? null;

      const outcome =
        await mutate(
          current
            ? structuredClone(current)
            : null,
        );

      db.states[scope] =
        structuredClone(outcome.state);

      return outcome.result;
    });
  }

  async exportScope(
    scope: string,
  ): Promise<ArborScopeSnapshot> {
    await this.waitForWrites();
    const db = await this.readUnlocked();
    const state = db.states[scope];

    if (!state) {
      throw new Error("transplant_scope_not_found");
    }

    const turns =
      (db.history[scope] ?? [])
        .map((turnId) => db.turns[turnId])
        .filter(
          (turn): turn is StoredArborTurn =>
            Boolean(turn),
        )
        .map((turn) => structuredClone(turn));

    return {
      scope,
      state: structuredClone(state),
      turns,
    };
  }

  async importScope(
    snapshot: ArborScopeSnapshot,
  ): Promise<void> {
    await this.enqueueMutation((db) => {
      if (
        db.states[snapshot.scope] ||
        (db.history[snapshot.scope]?.length ?? 0) > 0
      ) {
        throw new Error("transplant_target_not_empty");
      }

      db.states[snapshot.scope] =
        structuredClone(snapshot.state);

      db.history[snapshot.scope] = [];

      for (const turn of snapshot.turns) {
        if (turn.scope !== snapshot.scope) {
          throw new Error("transplant_turn_scope_mismatch");
        }

        const existing = db.turns[turn.turnId];

        if (
          existing &&
          existing.requestFingerprint !== turn.requestFingerprint
        ) {
          throw new Error("turn_id_conflict");
        }

        db.turns[turn.turnId] =
          structuredClone(turn);

        db.history[snapshot.scope].push(turn.turnId);
      }
    });
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

  private async enqueueMutation<T>(
    mutate: (db: DiskState) => Promise<T> | T,
  ): Promise<T> {
    let resolveResult:
      (value: T | PromiseLike<T>) => void =
      () => undefined;

    let rejectResult:
      (reason?: unknown) => void =
      () => undefined;

    const result =
      new Promise<T>((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
      });

    const operation =
      this.writeTail.then(async () => {
        try {
          const db = await this.readUnlocked();
          const value = await mutate(db);
          await this.writeAtomic(db);
          resolveResult(value);
        } catch (error) {
          rejectResult(error);
          throw error;
        }
      });

    this.writeTail = operation.then(
      () => undefined,
      () => undefined,
    );

    return result;
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
