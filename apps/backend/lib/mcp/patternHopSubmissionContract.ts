import { z } from "zod";

export const ARK_PATTERN_HOP_SUBMISSION_LIMITS = {
  minSeedChars: 2,
  maxSeedChars: 2000,
  maxHops: 8,
  maxDepth: 3,
} as const;

export const ArkPatternHopRequest = z.object({
  projectId: z.string().uuid(),
  requestId: z.string().uuid(),
  seed: z.string().trim()
    .min(ARK_PATTERN_HOP_SUBMISSION_LIMITS.minSeedChars)
    .max(ARK_PATTERN_HOP_SUBMISSION_LIMITS.maxSeedChars),
  runId: z.string().uuid().nullable(),
  maxHops: z.number().int().min(1).max(ARK_PATTERN_HOP_SUBMISSION_LIMITS.maxHops),
  maxDepth: z.number().int().min(1).max(ARK_PATTERN_HOP_SUBMISSION_LIMITS.maxDepth),
}).strict();

export const ArkPatternHopControlRequest = z.object({
  projectId: z.string().uuid(),
  runId: z.string().uuid(),
}).strict();

export type ArkPatternHopSubmissionRequest = z.infer<typeof ArkPatternHopRequest>;
