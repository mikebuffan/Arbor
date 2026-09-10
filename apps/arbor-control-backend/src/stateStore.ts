import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";

import type {
  ArborState,
  CanonicalArborResponse,
} from "./types.js";

type DiskState = {
  states: Record<string, ArborState>;
  turns: Record<string, CanonicalArborResponse>;
};

export interface ArborStateStore {
  load(scope: string): Promise<ArborState | null>;
  save(scope: string, state: ArborState): Promise<void>;
  loadTurn(turnId: string): Promise<CanonicalArborResponse | null>;
  saveTurn(turn: CanonicalArborResponse): Promise<void>;
}

export class JsonFileArborStateStore implements ArborStateStore {
  constructor(
    private readonly file =
      process.env.ARBOR_STATE_FILE ?? ".arbor-control/state.json",
  ) {}

  async load(scope: string): Promise<ArborState | null> {
    const db = await this.read();
    return db.states[scope] ?? null;
  }

  async save(scope: string, state: ArborState): Promise<void> {
    const db = await this.read();
    db.states[scope] = structuredClone(state);
    await this.write(db);
  }

  async loadTurn(turnId: string): Promise<CanonicalArborResponse | null> {
    const db = await this.read();
    return db.turns[turnId] ?? null;
  }

  async saveTurn(turn: CanonicalArborResponse): Promise<void> {
    const db = await this.read();
    db.turns[turn.turnId] = structuredClone(turn);
    await this.write(db);
  }

  private async read(): Promise<DiskState> {
    try {
      return JSON.parse(await readFile(this.file, "utf8")) as DiskState;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return { states: {}, turns: {} };
      }

      throw error;
    }
  }

  private async write(state: DiskState): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(state, null, 2), "utf8");
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
