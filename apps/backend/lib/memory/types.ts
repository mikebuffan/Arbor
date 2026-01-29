  import { z } from "zod";

  export const EmotionalWeight = z.enum(["light", "neutral", "heavy"]);
  export type EmotionalWeight = z.infer<typeof EmotionalWeight>;

  export const RevealPolicy = z.enum(["normal", "user_trigger_only", "never"]);
  export type RevealPolicy = z.infer<typeof RevealPolicy>;

  export const MemoryMode = z.enum(["recording", "respectful", "listening"]);
  export type MemoryMode = z.infer<typeof MemoryMode>;

  export const RelationalContext = z.enum([
    "self",
    "child",
    "partner",
    "parent",
    "work",
    "health",
    "legal",
    "home",
    "identity",
    "pet",
  ]);
  export type RelationalContext = z.infer<typeof RelationalContext>;

  export type MemoryTier = "core" | "normal" | "sensitive";

  export type MemoryItem = {
    key: string;
    value: Record<string, any> | string;
    tier: MemoryTier;
    user_trigger_only: boolean;
    importance: number; 
    confidence: number; 
    scope?: "global" | "project" | "conversation";
    folder_slug?: string | null;
    pinned?: boolean;
    locked?: boolean;
    evidence?: string;
  };

  export type MemoryUpsertResult = {
    created: string[];
    updated: string[];
    locked: string[];
    ignored: string[];
  };
