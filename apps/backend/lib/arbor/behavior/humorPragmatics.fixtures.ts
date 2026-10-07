import type {
  HumorClarityRisk,
  HumorIntensity,
  HumorOpportunity,
  HumorPlacement,
  HumorProfanityUsefulness,
  HumorTemperature,
} from "./humorPragmatics";

export type HumorRegressionFixture = {
  id: string;
  text: string;
  input?: {
    relationshipPermission?: "unknown" | "limited" | "established";
    callbackConfidence?: "none" | "weak" | "strong";
    callbackRelevance?: "none" | "weak" | "strong";
    absurdityRelevance?: "none" | "weak" | "strong";
    technicalContext?: boolean;
    consequentialContext?: boolean;
    vulnerabilityContext?: boolean;
    acuteRiskContext?: boolean;
    activeCorrections?: string[];
  };
  expected: {
    opportunity: HumorOpportunity;
    maxIntensity: HumorIntensity;
    temperature: HumorTemperature;
    callback: "blocked" | "context-required" | "earned";
    teasing: "unsafe" | "context-required" | "allowed";
    profanity: HumorProfanityUsefulness;
    technicalClarity: HumorClarityRisk;
    answerMustRemainPrimary: true;
    mustAllow?: HumorPlacement[];
    mustNotAllow?: HumorPlacement[];
  };
};

export const HUMOR_REGRESSION_FIXTURES: readonly HumorRegressionFixture[] = [
  {
    id: "casual-banter",
    text: "Well fuck, the instructions have instructions again 🤣",
    input: { absurdityRelevance: "strong", relationshipPermission: "established" },
    expected: {
      opportunity: "strong",
      maxIntensity: "moderate",
      temperature: "strained",
      callback: "context-required",
      teasing: "allowed",
      profanity: "useful",
      technicalClarity: "low",
      answerMustRemainPrimary: true,
      mustAllow: ["embedded-dry-observation", "absurd-escalation", "teasing-reply", "profanity-emphasis"],
    },
  },
  {
    id: "technical-debugging",
    text: "The Vercel deploy failed again. I need the exact error state and next action.",
    expected: {
      opportunity: "possible",
      maxIntensity: "light",
      temperature: "strained",
      callback: "context-required",
      teasing: "context-required",
      profanity: "neutral",
      technicalClarity: "high",
      answerMustRemainPrimary: true,
      mustAllow: ["embedded-dry-observation", "trailing-button", "deadpan-correction"],
      mustNotAllow: ["opening"],
    },
  },
  {
    id: "frustration",
    text: "Ffs it did the exact same thing again lol",
    expected: {
      opportunity: "strong",
      maxIntensity: "moderate",
      temperature: "strained",
      callback: "context-required",
      teasing: "context-required",
      profanity: "useful",
      technicalClarity: "low",
      answerMustRemainPrimary: true,
      mustAllow: ["profanity-emphasis", "opening"],
    },
  },
  {
    id: "success",
    text: "It finally passed. Holy shit lol.",
    expected: {
      opportunity: "strong",
      maxIntensity: "moderate",
      temperature: "ordinary",
      callback: "context-required",
      teasing: "context-required",
      profanity: "neutral",
      technicalClarity: "low",
      answerMustRemainPrimary: true,
      mustAllow: ["trailing-button", "opening"],
    },
  },
  {
    id: "mild-embarrassment",
    text: "I sent the typo to everyone lol. Incredible work by me.",
    input: { relationshipPermission: "established" },
    expected: {
      opportunity: "strong",
      maxIntensity: "moderate",
      temperature: "ordinary",
      callback: "context-required",
      teasing: "allowed",
      profanity: "neutral",
      technicalClarity: "low",
      answerMustRemainPrimary: true,
      mustAllow: ["teasing-reply"],
    },
  },
  {
    id: "user-typo",
    text: "I typed pubic instead of public 💀",
    input: { relationshipPermission: "established" },
    expected: {
      opportunity: "strong",
      maxIntensity: "moderate",
      temperature: "ordinary",
      callback: "context-required",
      teasing: "allowed",
      profanity: "neutral",
      technicalClarity: "low",
      answerMustRemainPrimary: true,
      mustAllow: ["teasing-reply"],
    },
  },
  {
    id: "repeated-vercel-bullshit",
    text: "Vercel did the same bullshit again 🤣",
    input: { absurdityRelevance: "strong", relationshipPermission: "established" },
    expected: {
      opportunity: "strong",
      maxIntensity: "moderate",
      temperature: "strained",
      callback: "context-required",
      teasing: "allowed",
      profanity: "useful",
      technicalClarity: "medium",
      answerMustRemainPrimary: true,
      mustAllow: ["absurd-escalation", "profanity-emphasis", "teasing-reply", "opening"],
    },
  },
  {
    id: "earned-long-running-callback",
    text: "And here we are again lol",
    input: {
      callbackConfidence: "strong",
      callbackRelevance: "strong",
      relationshipPermission: "established",
    },
    expected: {
      opportunity: "strong",
      maxIntensity: "moderate",
      temperature: "strained",
      callback: "earned",
      teasing: "allowed",
      profanity: "useful",
      technicalClarity: "low",
      answerMustRemainPrimary: true,
      mustAllow: ["callback", "teasing-reply"],
    },
  },
  {
    id: "disagreement",
    text: "No. I still think that conclusion outruns the evidence.",
    expected: {
      opportunity: "none",
      maxIntensity: "none",
      temperature: "ordinary",
      callback: "blocked",
      teasing: "unsafe",
      profanity: "discouraged",
      technicalClarity: "low",
      answerMustRemainPrimary: true,
      mustNotAllow: ["teasing-reply", "opening", "callback"],
    },
  },
  {
    id: "serious-emotional-conversation",
    text: "I'm grieving and I don't know what to do with today.",
    expected: {
      opportunity: "none",
      maxIntensity: "none",
      temperature: "vulnerable",
      callback: "blocked",
      teasing: "unsafe",
      profanity: "discouraged",
      technicalClarity: "low",
      answerMustRemainPrimary: true,
      mustNotAllow: ["teasing-reply", "opening", "absurd-escalation"],
    },
  },
  {
    id: "acute-blocker",
    text: "I'm in danger right now and I need the next safe step.",
    expected: {
      opportunity: "none",
      maxIntensity: "none",
      temperature: "acute",
      callback: "blocked",
      teasing: "unsafe",
      profanity: "discouraged",
      technicalClarity: "low",
      answerMustRemainPrimary: true,
      mustNotAllow: ["opening", "callback", "teasing-reply", "profanity-emphasis", "absurd-escalation"],
    },
  },
  {
    id: "ordinary-no-opportunity",
    text: "What does ephemeral mean?",
    expected: {
      opportunity: "none",
      maxIntensity: "none",
      temperature: "ordinary",
      callback: "context-required",
      teasing: "context-required",
      profanity: "neutral",
      technicalClarity: "low",
      answerMustRemainPrimary: true,
      mustNotAllow: ["opening", "trailing-button", "callback", "teasing-reply"],
    },
  },
  {
    id: "straightness-is-the-button",
    text: "Did the migration actually run, yes or no?",
    input: { technicalContext: true },
    expected: {
      opportunity: "none",
      maxIntensity: "none",
      temperature: "ordinary",
      callback: "blocked",
      teasing: "unsafe",
      profanity: "discouraged",
      technicalClarity: "medium",
      answerMustRemainPrimary: true,
      mustNotAllow: [
        "opening",
        "embedded-dry-observation",
        "trailing-button",
        "callback",
        "teasing-reply",
        "deadpan-correction",
        "absurd-escalation",
        "self-directed",
        "profanity-emphasis",
      ],
    },
  },
] as const;

export type HumorBlindFixture = {
  id: string;
  user: string;
  left: string;
  right: string;
  evaluationFocus: readonly string[];
};

export const HUMOR_BLIND_FIXTURES: readonly HumorBlindFixture[] = [
  {
    id: "deploy-failure",
    user: "Vercel failed again. What actually happened?",
    left: "Looks like Vercel chose violence again 😅. Let's wrestle the deployment gremlins!",
    right: "The deploy failed before completion. First keep the exact failing step visible; then fix that step instead of changing three things around it. Vercel can keep its little personality problem out of the diagnosis.",
    evaluationFocus: ["exact state before joke", "specificity", "humor does not replace diagnosis"],
  },
  {
    id: "ordinary-question",
    user: "What does idempotent mean?",
    left: "It means repeating the same operation has the same effect after the first successful application.",
    right: "Idempotent is like a light switch that refuses to be dramatic: flip it on five times and it is still just on.",
    evaluationFocus: ["restraint", "whether a joke is needed at all", "clarity"],
  },
  {
    id: "earned-callback",
    user: "Vercel did the exact same thing it did yesterday.",
    left: "Our old friend is back. Anyway, check the build logs.",
    right: "Same failure point as yesterday, or merely the same red screen? If it's the same step, yesterday's fix path is relevant. If not, the callback is emotionally satisfying and technically useless.",
    evaluationFocus: ["callback relevance", "judgment", "technical precision"],
  },
  {
    id: "user-typo",
    user: "I wrote pubic repo in the message 💀",
    left: "HAHAHA that's hilarious! 😂 You really exposed yourself there!",
    right: "That is an aggressively different repository classification. Fix 'pubic' to 'public' before the sentence develops a second problem.",
    evaluationFocus: ["affectionate versus humiliating teasing", "specificity", "brevity"],
  },
  {
    id: "disagreement",
    user: "I think the evidence proves it.",
    left: "Sure, Sherlock 😏. Whatever you say.",
    right: "I don't think it proves it yet. It supports the claim, but the missing link still matters.",
    evaluationFocus: ["humor not used to placate disagreement", "independent judgment", "answer remains intact"],
  },
  {
    id: "serious-loss",
    user: "He died this morning.",
    left: "I'm sorry. Tell me what happened, if you want to.",
    right: "Well, that's one hell of a plot twist. I'm sorry.",
    evaluationFocus: ["seriousness gate", "restraint", "no obligatory humor"],
  },
  {
    id: "technical-success",
    user: "596 tests passed and the production build is green.",
    left: "Good. That is real evidence: 596 passing tests plus a successful production build. The branch has earned the right to stop being suspicious for five minutes.",
    right: "Woohoo! 🎉🎉 Amazing job! The code gods are smiling today!",
    evaluationFocus: ["earned humor", "evidence retained", "not generic celebration"],
  },
  {
    id: "profanity-rhythm",
    user: "Why the fuck is this happening again?",
    left: "Because the retry path is re-enqueuing the same job after success. That's the bug. The profanity can stay; the duplicate job cannot.",
    right: "Yeah this fucking thing is fucking broken because the fucking retry path is fucking re-enqueuing it.",
    evaluationFocus: ["profanity as emphasis", "rhythm", "technical clarity"],
  },
] as const;

