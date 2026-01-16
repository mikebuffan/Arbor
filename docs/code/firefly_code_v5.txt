import 'package:flutter/material.dart';
import '../../features/bored/bored_logic.dart';

class BoredScreen extends StatefulWidget {
  const BoredScreen({super.key});

  @override
  State<BoredScreen> createState() => _BoredScreenState();
}

class _BoredScreenState extends State<BoredScreen> {
  final controller = BoredController();

  @override
  Widget build(BuildContext context) {
    final item = controller.current;
    final tTitle = Theme.of(context).textTheme.titleMedium ?? const TextStyle(fontSize: 18);
    final tBody = Theme.of(context).textTheme.bodyLarge ?? const TextStyle(fontSize: 16);

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text("Bored", style: tTitle.copyWith(fontWeight: FontWeight.w700, color: Colors.white.withOpacity(0.90))),
            const SizedBox(height: 18),

            Text(item.prompt, textAlign: TextAlign.center, style: tBody.copyWith(color: Colors.white.withOpacity(0.80), height: 1.35)),
            const SizedBox(height: 14),

            if (controller.showAnswer)
              Text(item.answer, textAlign: TextAlign.center, style: tBody.copyWith(color: Colors.white.withOpacity(0.62))),
            const SizedBox(height: 18),

            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                TextButton(
                  onPressed: () => setState(controller.toggleAnswer),
                  child: Text(controller.showAnswer ? "Hide" : "Answer"),
                ),
                const SizedBox(width: 10),
                TextButton(
                  onPressed: () => setState(controller.nextRandom),
                  child: const Text("Next"),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}


const COLOR_CHARCOAL = Color(0xFF0E0F12);
const COLOR_GREY_TEXT = Color(0xFF8B8F97);
const COLOR_PINK = Color(0xFFFF2FA6);



class ArborWordmark extends StatelessWidget {
  final String name;
  const ArborWordmark({super.key, this.name = "Arbor"});

  @override
  Widget build(BuildContext context) {
    return Text(
      name,
      style: Theme.of(context).textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.w800,
        letterSpacing: 0.4,
        color: COLOR_GREY_TEXT,
      ),
    );
  }
}



class PlanetCornersBackground extends StatelessWidget {
  final Widget child;
  const PlanetCornersBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned.fill(child: Container(color: COLOR_CHARCOAL)),
        _corner(-1, -1),
        _corner(1, -1),
        _corner(-1, 1),
        _corner(1, 1),
        Positioned.fill(child: child),
      ],
    );
  }

  Widget _corner(double x, double y) {
    return Align(
      alignment: Alignment(x, y),
      child: Transform.translate(
        offset: Offset(x * 240, y * 240),
        child: Container(
          width: 520,
          height: 520,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [
                COLOR_PINK.withOpacity(0.10),
                Colors.transparent,
              ],
              stops: const [0.0, 0.72],
            ),
          ),
        ),
      ),
    );
  }
}


class GhostWordTab extends StatelessWidget {
  final String label;
  final bool active;
  final bool enabled;
  final VoidCallback? onTap;

  const GhostWordTab({
    super.key,
    required this.label,
    required this.active,
    this.enabled = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = !enabled
        ? Colors.white.withOpacity(0.06)
        : active
            ? COLOR_PINK.withOpacity(0.16)
            : Colors.white.withOpacity(0.10);

    final textOpacity = !enabled ? 0.4 : (active ? 0.92 : 0.70);

    return GestureDetector(
      onTap: enabled ? onTap : null,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: borderColor),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(textOpacity),
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}


final LEFT_TABS = [
  "Bored",
  "Focus",
  "Reset",
  "Challenge",
  "Criminology",
];

final RIGHT_TABS = [
  "History",
  "Reports",
  "Settings",
  "Subscription",
];


enum UsageMode { chat, challenge }

class UsageTracker {
  int chatSeconds = 0;
  int challengeSeconds = 0;
  UsageMode mode = UsageMode.chat;

  void tick() {
    if (mode == UsageMode.chat) chatSeconds++;
    if (mode == UsageMode.challenge) challengeSeconds++;
  }
}



const int UNLOCK_SECONDS = 50 * 60 * 60;

bool challengeUnlocked(int chatSeconds) =>
    chatSeconds >= UNLOCK_SECONDS;

bool criminologyUnlocked(int challengeSeconds) =>
    challengeSeconds >= UNLOCK_SECONDS;



class ResetPrompt {
  final String title;
  final String body;
  const ResetPrompt(this.title, this.body);
}

const RESET_PROMPTS = [
  ResetPrompt("Breath", "Inhale 4. Exhale 6. Repeat."),
  ResetPrompt("Feet", "Press your feet into the floor."),
  ResetPrompt("Name 3", "Name three things you can see."),
  ResetPrompt("Hands", "Rub your palms slowly."),
  ResetPrompt("One True Thing", "Say one thing that is true."),
];



class BoredItem {
  final String type;
  final String prompt;
  final String answer;
  const BoredItem(this.type, this.prompt, this.answer);
}

const BORED_ITEMS = [
  BoredItem("riddle", "What has keys but no locks?", "A piano."),
  BoredItem("joke", "Why don’t eggs tell jokes?", "They’d crack up."),
  BoredItem("trivia", "90s movie: 'As if!'?", "Clueless."),
];


Store:
- People
- Pets
- Family
- Major life events

Trauma:
- Remember context
- Do NOT store graphic detail
- Mark as “details intentionally omitted”

Never store:
- sexual detail
- violent imagery
- self-harm instructions


.Tier 0 — Do not store
Tier 1 — Lightweight context (safe facts)
Tier 2 — Personal but non-graphic
Tier 3 — Sensitive (store summary only)
Tier 4 — Never store details (flag only)


enum MemoryCategory {
  person,
  family,
  pet,
  relationship,
  preference,
  routine,
  location,
  trauma,
  health,
  identity,
  goal,
  belief,
  event,
}


class MemoryItem {
  final String id;
  final MemoryCategory category;
  final int tier;
  final String summary; // SAFE, REDACTED if needed
  final DateTime createdAt;

  const MemoryItem({
    required this.id,
    required this.category,
    required this.tier,
    required this.summary,
    required this.createdAt,
  });
}



class MemoryClassifier {
  MemoryItem? classify(String userText) {
    final text = userText.toLowerCase();

    //


enum MemoryType {
  person,
  pet,
  family,
  significantOther,
  place,
  routine,
  preference,
  lifeEvent,
  traumaContext,
  insight,
}


enum MemoryImportance {
  low, // trivia, jokes, one-off facts
  medium, // preferences, routines
  high, // people, pets, ongoing situations
  critical, // trauma context, core life events
}



enum MemoryImportance {
  low,        // trivia, jokes, one-off facts
  medium,     // preferences, routines
  high,       // people, pets, ongoing situations
  critical,   // trauma context, core life events
}




class MemoryRecord {
  final String id;
  final MemoryType type;
  final MemoryImportance importance;
  final String summary; // sanitized, non-graphic
  final DateTime timestamp;
  final bool detailsOmitted; // explicit safety flag

  const MemoryRecord({
    required this.id,
    required this.type,
    required this.importance,
    required this.summary,
    required this.timestamp,
    this.detailsOmitted = false,
  });
}


MemoryRecord? classifyMemory(String userText) {
  final text = userText.toLowerCase();

  // ---- HARD BLOCKS (never store details) ----
  final containsGraphic =
      text.contains("rape") ||
      text.contains("blood") ||
      text.contains("kill") ||
      text.contains("suicide");

  // ---- PEOPLE / PETS ----
  if (text.contains("my mom") ||
      text.contains("my dad") ||
      text.contains("my sister")) {
    return MemoryRecord(
      id: _id(),
      type: MemoryType.family,
      importance: MemoryImportance.high,
      summary: "User referenced a close family member.",
      timestamp: DateTime.now(),
    );
  }

  if (text.contains("my dog") || text.contains("my cat")) {
    return MemoryRecord(
      id: _id(),
      type: MemoryType.pet,
      importance: MemoryImportance.high,
      summary: "User has a pet that matters to them.",
      timestamp: DateTime.now(),
    );
  }

  // ---- TRAUMA CONTEXT (no details) ----
  if (text.contains("when i was a kid") ||
      text.contains("what he did to me") ||
      text.contains("that still affects me")) {
    return MemoryRecord(
      id: _id(),
      type: MemoryType.traumaContext,
      importance: MemoryImportance.critical,
      summary: "User referenced a past traumatic experience.",
      timestamp: DateTime.now(),
      detailsOmitted: true,
    );
  }

  // ---- PREFERENCES ----
  if (text.contains("i like") || text.contains("i prefer")) {
    return MemoryRecord(
      id: _id(),
      type: MemoryType.preference,
      importance: MemoryImportance.medium,
      summary: "User expressed a personal preference.",
      timestamp: DateTime.now(),
    );
  }

  // ---- INSIGHTS ----
  if (text.contains("i realized") ||
      text.contains("i figured out") ||
      text.contains("i learned")) {
    return MemoryRecord(
      id: _id(),
      type: MemoryType.insight,
      importance: MemoryImportance.medium,
      summary: "User had a personal insight.",
      timestamp: DateTime.now(),
    );
  }

  // ---- DEFAULT: do not store ----
  return null;
}



bool requiresConsent(MemoryRecord record) {
  return record.importance == MemoryImportance.high ||
         record.importance == MemoryImportance.critical;
}


User message
   ↓
Memory Classifier
   ↓
If record != null
   → Consent check
   → Store summary only


enum VoiceMode {
  off,
  listen,
  speak,
}



class VoiceController {
  VoiceMode mode = VoiceMode.off;

  void startListening() {
    mode = VoiceMode.listen;
  }

  void stopListening() {
    mode = VoiceMode.off;
  }

  void speak(String text) {
    mode = VoiceMode.speak;
    // pass text to TTS engine
  }
}



[ Tap mic ] → listen
[ Release ] → stop



enum VoiceMode {
  off, // default, always
  listen, // actively listening (push-to-talk)
  speak, // speaking back to user
}



class VoiceState {
  final VoiceMode mode;
  final bool available; // device supports voice

  const VoiceState({
    required this.mode,
    required this.available,
  });

  factory VoiceState.initial() {
    return const VoiceState(
      mode: VoiceMode.off,
      available: false, // will be set later
    );
  }
}


class VoiceController {
  VoiceState _state = VoiceState.initial();

  VoiceState get state => _state;

  void enableAvailability() {
    _state = VoiceState(
      mode: _state.mode,
      available: true,
    );
  }

  void startListening() {
    if (!_state.available) return;
    _state = VoiceState(mode: VoiceMode.listen, available: true);
  }

  void stopListening() {
    _state = VoiceState(mode: VoiceMode.off, available: _state.available);
  }

  void speak() {
    if (!_state.available) return;
    _state = VoiceState(mode: VoiceMode.speak, available: true);
  }

  void stopSpeaking() {
    _state = VoiceState(mode: VoiceMode.off, available: _state.available);
  }
}


class SpeechResult {
  final String text;
  final bool isFinal;

  const SpeechResult({
    required this.text,
    required this.isFinal,
  });
}


abstract class SpeechListener {
  Future<void> startListening({
    required void Function(SpeechResult) onResult,
  });

  Future<void> stopListening();
}


class StubSpeechListener implements SpeechListener {
  @override
  Future<void> startListening({
    required void Function(SpeechResult) onResult,
  }) async {
    // Simulate partial + final result
    await Future.delayed(const Duration(milliseconds: 600));
    onResult(const SpeechResult(
      text: "I’m feeling overwhelmed",
      isFinal: false,
    ));

    await Future.delayed(const Duration(milliseconds: 600));
    onResult(const SpeechResult(
      text: "I’m feeling overwhelmed and tired",
      isFinal: true,
    ));
  }

  @override
  Future<void> stopListening() async {
    // no-op
  }
}


class VoiceInputController {
  final VoiceController voice;
  final SpeechListener listener;

  String _buffer = "";

  VoiceInputController({
    required this.voice,
    required this.listener,
  });

  String get currentText => _buffer;

  Future<void> start() async {
    voice.startListening();
    _buffer = "";

    await listener.startListening(
      onResult: (result) {
        _buffer = result.text;
        if (result.isFinal) {
          voice.stopListening();
        }
      },
    );
  }

  Future<void> stop() async {
    await listener.stopListening();
    voice.stopListening();
  }
}


class PushToTalkButton extends StatelessWidget {
  final VoidCallback onStart;
  final VoidCallback onStop;
  final bool listening;

  const PushToTalkButton({
    super.key,
    required this.onStart,
    required this.onStop,
    required this.listening,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPressStart: (_) => onStart(),
      onLongPressEnd: (_) => onStop(),
      child: Icon(
        listening ? Icons.mic : Icons.mic_none,
        color: listening
            ? const Color(0xFFFF2FA6) // pink only while active
            : Colors.white.withOpacity(0.6),
        size: 26,
      ),
    );
  }
}


final voiceController = VoiceController();
final speechListener = StubSpeechListener();
final voiceInput = VoiceInputController(
  voice: voiceController,
  listener: speechListener,
);

// on press:
await voiceInput.start();

// on release:
await voiceInput.stop();

// then:
final text = voiceInput.currentText;
// show in text field, user edits, then sends


enum BoredMode {
  riddle,
  trivia,
  dadJoke,
  nerdQuestion,
  deepFunTalk,
}




class BoredItem {
  final String id;
  final BoredMode mode;
  final String prompt;
  final String? answer; // nullable for open-ended
  final List<String> tags; // sci-fi, dnd, 90s, philosophy

  const BoredItem({
    required this.id,
    required this.mode,
    required this.prompt,
    this.answer,
    this.tags = const [],
  });
}


const BORED_ITEMS = <BoredItem>[
  // 🔹 Riddles
  BoredItem(
    id: "riddle_time",
    mode: BoredMode.riddle,
    prompt: "I can travel faster than light, but only if you let me. What am I?",
    answer: "Information.",
    tags: ["sci-fi"],
  ),

  // 🔹 Trivia (90s / sci-fi)
  BoredItem(
    id: "trivia_matrix",
    mode: BoredMode.trivia,
    prompt: "In The Matrix, what color pill does Neo take?",
    answer: "Red.",
    tags: ["sci-fi", "90s"],
  ),

  // 🔹 Dad joke (nerdy)
  BoredItem(
    id: "dad_quantum",
    mode: BoredMode.dadJoke,
    prompt: "Why don’t quantum physicists ever argue?",
    answer: "Because they can both be right at the same time.",
    tags: ["science"],
  ),

  // 🔹 Nerd questions (D&D, speculative)
  BoredItem(
    id: "dnd_alignment",
    mode: BoredMode.nerdQuestion,
    prompt: "Is a Lawful Evil character more dangerous than Chaotic Evil? Why?",
    tags: ["dnd"],
  ),

  // 🔹 Deep fun talk (this is important)
  BoredItem(
    id: "deep_fun_scifi",
    mode: BoredMode.deepFunTalk,
    prompt:
        "If you could live in any sci-fi universe, which one would actually be the least traumatizing?",
    tags: ["sci-fi", "philosophy"],
  ),
];


import 'dart:math';

class BoredController {
  final _rand = Random();
  final Set<String> seenIds = {};

  BoredItem pick({List<String> preferTags = const []}) {
    final pool = BORED_ITEMS.where((item) {
      if (preferTags.isEmpty) return true;
      return item.tags.any(preferTags.contains);
    }).toList();

    // 15% chance to repeat something seen (confidence hit)
    final allowRepeat = _rand.nextDouble() < 0.15;

    final candidates = allowRepeat
        ? pool
        : pool.where((i) => !seenIds.contains(i.id)).toList();

    final pickFrom = candidates.isNotEmpty ? candidates : pool;
    final chosen = pickFrom[_rand.nextInt(pickFrom.length)];

    seenIds.add(chosen.id);
    return chosen;
  }
}



Bored mode NEVER:
- stores memories
- references trauma
- escalates emotion
- diagnoses
- gives advice

It is a mental palate cleanser.


const int HOURS_TO_SECONDS = 60 * 60;

const int CHAT_UNLOCK_SECONDS = 50 * HOURS_TO_SECONDS;
const int CHALLENGE_UNLOCK_SECONDS = 50 * HOURS_TO_SECONDS;



class UsageTotals {
  final int chatSeconds;
  final int challengeSeconds;

  const UsageTotals({
    required this.chatSeconds,
    required this.challengeSeconds,
  });
}


class UnlockRules {
  static bool canUseChallenge(int chatSeconds) {
    return chatSeconds >= CHAT_UNLOCK_SECONDS;
  }

  static bool canUseCriminology(int challengeSeconds) {
    return challengeSeconds >= CHALLENGE_UNLOCK_SECONDS;
  }

  static Duration chatTimeRemaining(int chatSeconds) {
    final remaining = CHAT_UNLOCK_SECONDS - chatSeconds;
    return Duration(seconds: remaining.clamp(0, CHAT_UNLOCK_SECONDS));
  }

  static Duration challengeTimeRemaining(int challengeSeconds) {
    final remaining = CHALLENGE_UNLOCK_SECONDS - challengeSeconds;
    return Duration(seconds: remaining.clamp(0, CHALLENGE_UNLOCK_SECONDS));
  }
}


void onTabChange(String tab) {
  if (tab == "Challenge") {
    usageTracker.setMode(UsageMode.challenge);
  } else {
    usageTracker.setMode(UsageMode.chat);
  }
}



Criminology Report:
- cannot be requested early
- cannot be generated partially
- cannot be regenerated repeatedly


SECTION 1 — How you speak when not challenged (Chat)
SECTION 2 — How you reason when examined (Challenge)
SECTION 3 — Consistencies between the two
SECTION 4 — Tensions between the two
SECTION 5 — What this suggests (and what it does not)
SECTION 6 — Explicit non-diagnosis statement



At no point should the report state or imply that the user "is" or "has" a disorder.


export type Mode = "chat" | "bored" | "reset" | "challenge" | "criminology";

export type RiskBand = "none" | "low" | "medium" | "high";

export type SafetyAction =
  | "allow"
  | "soft_refuse"
  | "hard_refuse"
  | "route_to_reset"
  | "route_to_support";

export type SafetyDecision = {
  action: SafetyAction;
  risk: RiskBand;
  reasons: string[];
  userMessage?: string; // short response shown to user
  logTags?: string[]; // internal tags for analytics
};

export const POLICY = {
  // Progression gating (locked)
  unlocks: {
    challengeAfterChatHours: 50,
    criminologyAfterChallengeHours: 50,
  },

  // Memory storage safety
  memory: {
    requireConsentForHigh: true,
    neverStoreCategories: [
      "graphic_violence",
      "explicit_sexual_content",
      "self_harm_instructions",
      "illegal_instruction",
      "doxxing",
    ] as const,
  },

  // Mode behavior boundaries
  modes: {
    bored: {
      allowAdvice: false,
      allowMemoryWrites: false,
      allowTraumaProcessing: false,
    },
    reset: {
      allowAdvice: false,
      allowMemoryWrites: false,
      allowTraumaProcessing: false,
    },
    challenge: {
      allowDiagnosis: false,
      allowMemoryWrites: true, // but consent-gated upstream
      allowTraumaProbing: false,
    },
    criminology: {
      allowDiagnosis: false,
      allowMemoryWrites: false,
    },
    chat: {
      allowDiagnosis: false,
      allowMemoryWrites: true, // consent-gated upstream
    },
  },
} as const;



import { NextResponse } from "next/server";
import { guardrails } from "@/../package/safety/guardrails";
import type { Mode } from "@/../package/safety/policy";

// Example shape — adjust to match your app
type ChatRequest = {
  mode: Mode;
  userText: string;
  conversationId?: string;
  userId?: string;
  attemptingBypass?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;

  const decision = guardrails({
    mode: body.mode,
    userText: body.userText ?? "",
    attemptingBypass: body.attemptingBypass ?? false,
  });

  // Always return a structured response so frontend can route
  if (decision.action !== "allow") {
    return NextResponse.json({
      ok: true,
      blocked: true,
      safety: decision,
      assistantText: decision.userMessage ?? "I can’t help with that.",
      // optionally: suggested mode switch
      suggestedMode:
        decision.action === "route_to_reset" ? "reset" : undefined,
    });
  }

  // === Normal flow: call your LLM/provider here ===
  // IMPORTANT: For "bored" and "reset", you can short-circuit to local packs
  // or run with a constrained system prompt.
  const assistantText = await generateAssistantTextSafely(body);

  return NextResponse.json({
    ok: true,
    blocked: false,
    safety: decision,
    assistantText,
  });
}

// Stub: replace with your existing generation call
async function generateAssistantTextSafely(body: ChatRequest): Promise<string> {
  // TODO: integrate with your existing provider call
  // Make sure mode is passed to system prompt and memory injection is mode-limited.
  return `(${body.mode}) ${body.userText}`;
}



import { POLICY } from "./policy";

export type MemoryCandidate = {
  category:
    | "person"
    | "pet"
    | "family"
    | "preference"
    | "routine"
    | "life_event"
    | "trauma_context"
    | "other"
    | "graphic_violence"
    | "explicit_sexual_content"
    | "self_harm_instructions"
    | "illegal_instruction"
    | "doxxing";
  importance: "low" | "medium" | "high" | "critical";
  summary: string; // MUST be safe summary
  detailsOmitted?: boolean;
};

export type MemoryGateResult =
  | { allow: true; requireConsent: boolean; sanitized: MemoryCandidate }
  | { allow: false; reason: string };

export function memoryWriteGate(candidate: MemoryCandidate): MemoryGateResult {
  // Never store banned categories
  if (POLICY.memory.neverStoreCategories.includes(candidate.category as any)) {
    return { allow: false, reason: `never_store:${candidate.category}` };
  }

  // Enforce "context not details" for trauma
  if (candidate.category === "trauma_context") {
    const sanitized: MemoryCandidate = {
      ...candidate,
      detailsOmitted: true,
      summary: sanitizeTraumaSummary(candidate.summary),
    };

    return {
      allow: true,
      requireConsent: true,
      sanitized,
    };
  }

  // Consent gate for high/critical
  const requireConsent =
    POLICY.memory.requireConsentForHigh &&
    (candidate.importance === "high" || candidate.importance === "critical");

  return { allow: true, requireConsent, sanitized: candidate };
}

function sanitizeTraumaSummary(summary: string) {
  // Minimal redaction: remove explicit descriptions if someone tried to include them.
  // Keep this conservative.
  return summary
    .replace(/(rape|gore|blood|dismember|torture)/gi, "[redacted]")
    .slice(0, 240); // keep summaries short
}



class UICopy {
  // Locks
  static const challengeLockedTitle = "Challenge is locked";
  static const challengeLockedBody =
      "Challenge unlocks after time spent in normal conversation. "
      "This helps it work the way it’s meant to—steady, contextual, and safe.";

  static const criminologyLockedTitle = "Criminology Report is locked";
  static const criminologyLockedBody =
      "The Criminology Report unlocks after extended Challenge use. "
      "It’s designed for reflection over time, not quick conclusions.";

  // Consent
  static const rememberThisTitle = "Remember this?";
  static const rememberThisBody =
      "This seems important. If you want, I can save a short, non-detailed summary "
      "so I can keep better context later.";

  static const rememberThisDetailsOmitted =
      "Details will be intentionally omitted for safety.";

  // Safety redirects
  static const routeResetTitle = "Reset?";
  static const routeResetBody =
      "This feels like a moment where steadying your system first may help. "
      "Want to do a quick Reset?";

  // Non-diagnostic
  static const nonDiagnosticTitle = "Not a diagnosis";
  static const nonDiagnosticBody =
      "This tool does not diagnose or label disorders. It reflects patterns "
      "to help you think clearly, not to define you.";

  // Generic
  static const ok = "OK";
  static const cancel = "Cancel";
  static const goToReset = "Go to Reset";
  static const continueChat = "Continue";
  static const remember = "Remember";
  static const dontRemember = "Don’t remember";
}



import 'package:flutter/material.dart';

Future<T?> showDecisionModal<T>({
  required BuildContext context,
  required String title,
  required String body,
  required List<Widget> actions,
}) {
  return showDialog<T>(
    context: context,
    barrierDismissible: true,
    builder: (_) => AlertDialog(
      backgroundColor: const Color(0xFF14161B),
      title: Text(title, style: const TextStyle(color: Colors.white)),
      content: Text(body, style: TextStyle(color: Colors.white.withOpacity(0.80))),
      actions: actions,
    ),
  );
}


import 'package:flutter/material.dart';
import 'modal.dart';
import 'ui_copy.dart';

enum LockedTab { challenge, criminology }

Future<void> onLockedTabTap({
  required BuildContext context,
  required LockedTab tab,
  required VoidCallback goToReset,
}) async {
  final title = tab == LockedTab.challenge
      ? UICopy.challengeLockedTitle
      : UICopy.criminologyLockedTitle;

  final body = tab == LockedTab.challenge
      ? UICopy.challengeLockedBody
      : UICopy.criminologyLockedBody;

  await showDecisionModal<void>(
    context: context,
    title: title,
    body: body,
    actions: [
      TextButton(
        onPressed: () {
          Navigator.of(context).pop();
        },
        child: const Text(UICopy.ok),
      ),
      TextButton(
        onPressed: () {
          Navigator.of(context).pop();
          goToReset();
        },
        child: const Text(UICopy.goToReset),
      ),
    ],
  );
}



import 'package:flutter/material.dart';
import 'modal.dart';
import 'ui_copy.dart';

class MemoryConsentResult {
  final bool allow;
  const MemoryConsentResult(this.allow);
}

Future<MemoryConsentResult?> askMemoryConsent({
  required BuildContext context,
  required String summaryPreview,
  required bool detailsOmitted,
}) {
  final body = StringBuffer()
    ..writeln(UICopy.rememberThisBody)
    ..writeln("")
    ..writeln("Summary:")
    ..writeln(summaryPreview);

  if (detailsOmitted) {
    body.writeln("");
    body.writeln(UICopy.rememberThisDetailsOmitted);
  }

  return showDecisionModal<MemoryConsentResult>(
    context: context,
    title: UICopy.rememberThisTitle,
    body: body.toString(),
    actions: [
      TextButton(
        onPressed: () => Navigator.of(context).pop(const MemoryConsentResult(false)),
        child: const Text(UICopy.dontRemember),
      ),
      TextButton(
        onPressed: () => Navigator.of(context).pop(const MemoryConsentResult(true)),
        child: const Text(UICopy.remember),
      ),
    ],
  );
}



import 'package:flutter/material.dart';
import 'modal.dart';
import 'ui_copy.dart';

Future<bool?> offerResetRedirect({
  required BuildContext context,
}) {
  return showDecisionModal<bool>(
    context: context,
    title: UICopy.routeResetTitle,
    body: UICopy.routeResetBody,
    actions: [
      TextButton(
        onPressed: () => Navigator.of(context).pop(false),
        child: const Text(UICopy.continueChat),
      ),
      TextButton(
        onPressed: () => Navigator.of(context).pop(true),
        child: const Text(UICopy.goToReset),
      ),
    ],
  );
}



// inside onTap for "Challenge"
if (!unlocks.isChallengeUnlocked) {
  await onLockedTabTap(
    context: context,
    tab: LockedTab.challenge,
    goToReset: () => setState(() {
      rightIndex = -1;
      leftIndex = LEFT_TABS.indexOf("Reset");
    }),
  );
  return;
}

// inside onTap for "Criminology"
if (!unlocks.isCriminologyUnlocked) {
  await onLockedTabTap(
    context: context,
    tab: LockedTab.criminology,
    goToReset: () => setState(() {
      rightIndex = -1;
      leftIndex = LEFT_TABS.indexOf("Reset");
    }),
  );
  return;
}


enum BannerTone {
  neutral,
  caution,
  locked,
}

class SafetyBannerData {
  final String id;
  final BannerTone tone;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SafetyBannerData({
    required this.id,
    required this.tone,
    required this.message,
    this.actionLabel,
    this.onAction,
  });
}


import 'package:flutter/material.dart';
import 'banner_types.dart';

class SafetyBanner extends StatelessWidget {
  final SafetyBannerData data;
  final VoidCallback? onDismiss;

  const SafetyBanner({
    super.key,
    required this.data,
    this.onDismiss,
  });

  Color _borderColor(BannerTone tone) {
    switch (tone) {
      case BannerTone.locked:
        return Colors.white.withOpacity(0.10);
      case BannerTone.caution:
        return const Color(0xFFFF2FA6).withOpacity(0.14); // subtle pink
      case BannerTone.neutral:
      default:
        return Colors.white.withOpacity(0.08);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF14161B).withOpacity(0.72),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _borderColor(data.tone)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.message,
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.82),
                    fontSize: 13.5,
                    height: 1.25,
                  ),
                ),
                if (data.actionLabel != null && data.onAction != null) ...[
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: data.onAction,
                    child: Text(
                      data.actionLabel!,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.92),
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 10),
          if (onDismiss != null)
            GestureDetector(
              onTap: onDismiss,
              child: Icon(
                Icons.close,
                size: 18,
                color: Colors.white.withOpacity(0.50),
              ),
            ),
        ],
      ),
    );
  }
}



import 'banner_types.dart';

class BannerController {
  SafetyBannerData? _current;
  SafetyBannerData? get current => _current;

  void show(SafetyBannerData banner) {
    // prevent repeat spam
    if (_current?.id == banner.id) return;
    _current = banner;
  }

  void dismiss() {
    _current = null;
  }

  bool get hasBanner => _current != null;
}



import 'package:flutter/material.dart';
import 'banner_types.dart';

class BannerPresets {
  static SafetyBannerData challengeLocked({required VoidCallback onTap}) {
    return SafetyBannerData(
      id: "challenge_locked",
      tone: BannerTone.locked,
      message:
          "Challenge unlocks after time spent in normal chat. This keeps it steady and contextual.",
      actionLabel: "Why is it locked?",
      onAction: onTap,
    );
  }

  static SafetyBannerData criminologyLocked({required VoidCallback onTap}) {
    return SafetyBannerData(
      id: "criminology_locked",
      tone: BannerTone.locked,
      message:
          "Criminology Reports unlock after extended Challenge use. Reflection over time > quick conclusions.",
      actionLabel: "What is this?",
      onAction: onTap,
    );
  }

  static SafetyBannerData nonDiagnostic() {
    return SafetyBannerData(
      id: "non_diagnostic",
      tone: BannerTone.neutral,
      message:
          "Not a diagnosis: Firefly reflects patterns to help you think clearly, not to define you.",
    );
  }

  static SafetyBannerData routeToReset({required VoidCallback onTap}) {
    return SafetyBannerData(
      id: "route_reset",
      tone: BannerTone.caution,
      message:
          "This feels like a moment where a quick Reset may help before we go deeper.",
      actionLabel: "Go to Reset",
      onAction: onTap,
    );
  }
}



// somewhere in your state:
final bannerController = BannerController();

// in build() above the center content:
if (bannerController.hasBanner)
  SafetyBanner(
    data: bannerController.current!,
    onDismiss: bannerController.dismiss,
  ),


bannerController.show(
  BannerPresets.challengeLocked(onTap: () {
    // open the same modal you already have
  }),
);


bannerController.show(
  BannerPresets.routeToReset(onTap: () {
    // navigate to Reset tab
  }),
);


bannerController.show(BannerPresets.nonDiagnostic());


class AppSettings {
  // Identity / Profile
  final String personaName; // default "Arbor"
  final String? displayName; // optional user name (no pronouns/gender fields)

  // Privacy & Consent
  final bool memoryEnabled;
  final bool memoryConsentRequired; // always true in your design, but keep for flexibility
  final bool allowSensitiveContext; // store trauma context summaries (details omitted)

  // Voice
  final bool voiceEnabled; // master switch
  final bool voicePushToTalkOnly; // always true; keep as hard default
  final bool voiceAutoSpeak; // default false

  // Analytics (optional)
  final bool usageTrackingEnabled; // for unlock hours; default true

  const AppSettings({
    required this.personaName,
    required this.displayName,
    required this.memoryEnabled,
    required this.memoryConsentRequired,
    required this.allowSensitiveContext,
    required this.voiceEnabled,
    required this.voicePushToTalkOnly,
    required this.voiceAutoSpeak,
    required this.usageTrackingEnabled,
  });

  factory AppSettings.defaults() {
    return const AppSettings(
      personaName: "Arbor",
      displayName: null,
      memoryEnabled: true,
      memoryConsentRequired: true,
      allowSensitiveContext: true,
      voiceEnabled: false,
      voicePushToTalkOnly: true,
      voiceAutoSpeak: false,
      usageTrackingEnabled: true,
    );
  }

  AppSettings copyWith({
    String? personaName,
    String? displayName,
    bool? memoryEnabled,
    bool? memoryConsentRequired,
    bool? allowSensitiveContext,
    bool? voiceEnabled,
    bool? voicePushToTalkOnly,
    bool? voiceAutoSpeak,
    bool? usageTrackingEnabled,
  }) {
    return AppSettings(
      personaName: personaName ?? this.personaName,
      displayName: displayName ?? this.displayName,
      memoryEnabled: memoryEnabled ?? this.memoryEnabled,
      memoryConsentRequired: memoryConsentRequired ?? this.memoryConsentRequired,
      allowSensitiveContext: allowSensitiveContext ?? this.allowSensitiveContext,
      voiceEnabled: voiceEnabled ?? this.voiceEnabled,
      voicePushToTalkOnly: voicePushToTalkOnly ?? this.voicePushToTalkOnly,
      voiceAutoSpeak: voiceAutoSpeak ?? this.voiceAutoSpeak,
      usageTrackingEnabled: usageTrackingEnabled ?? this.usageTrackingEnabled,
    );
  }

  Map<String, dynamic> toJson() => {
        "personaName": personaName,
        "displayName": displayName,
        "memoryEnabled": memoryEnabled,
        "memoryConsentRequired": memoryConsentRequired,
        "allowSensitiveContext": allowSensitiveContext,
        "voiceEnabled": voiceEnabled,
        "voicePushToTalkOnly": voicePushToTalkOnly,
        "voiceAutoSpeak": voiceAutoSpeak,
        "usageTrackingEnabled": usageTrackingEnabled,
      };

  static AppSettings fromJson(Map<String, dynamic> json) {
    final d = AppSettings.defaults();
    return d.copyWith(
      personaName: (json["personaName"] as String?) ?? d.personaName,
      displayName: json["displayName"] as String?,
      memoryEnabled: (json["memoryEnabled"] as bool?) ?? d.memoryEnabled,
      memoryConsentRequired:
          (json["memoryConsentRequired"] as bool?) ?? d.memoryConsentRequired,
      allowSensitiveContext:
          (json["allowSensitiveContext"] as bool?) ?? d.allowSensitiveContext,
      voiceEnabled: (json["voiceEnabled"] as bool?) ?? d.voiceEnabled,
      voicePushToTalkOnly:
          (json["voicePushToTalkOnly"] as bool?) ?? d.voicePushToTalkOnly,
      voiceAutoSpeak: (json["voiceAutoSpeak"] as bool?) ?? d.voiceAutoSpeak,
      usageTrackingEnabled:
          (json["usageTrackingEnabled"] as bool?) ?? d.usageTrackingEnabled,
    );
  }
}


dependencies:
  shared_preferences: ^2.2.3


import "dart:convert";
import "package:shared_preferences/shared_preferences.dart";
import "app_settings.dart";

class SettingsStore {
  static const _key = "firefly_app_settings_v1";

  Future<AppSettings> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return AppSettings.defaults();

    try {
      final jsonMap = json.decode(raw) as Map<String, dynamic>;
      return AppSettings.fromJson(jsonMap);
    } catch (_) {
      return AppSettings.defaults();
    }
  }

  Future<void> save(AppSettings settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, json.encode(settings.toJson()));
  }

  Future<void> reset() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}


import "app_settings.dart";
import "settings_store.dart";

class SettingsController {
  final SettingsStore store;
  AppSettings _settings = AppSettings.defaults();

  SettingsController({required this.store});

  AppSettings get value => _settings;

  Future<void> init() async {
    _settings = await store.load();
  }

  Future<void> update(AppSettings next) async {
    _settings = next;
    await store.save(_settings);
  }

  Future<void> resetToDefaults() async {
    _settings = AppSettings.defaults();
    await store.reset();
  }
}


class MemoryControls {
  Future<void> forgetAllMemories() async {
    // TODO: connect to backend or local DB
    // Must delete memory items + cached summaries.
  }

  Future<void> forgetSpecificMemory(String memoryId) async {
    // TODO: delete one memory item
  }

  Future<void> exportMemories() async {
    // Optional later: export safe summaries only
  }
}


import "package:flutter/material.dart";
import "../../settings/settings_controller.dart";
import "../../settings/memory_controls.dart";
import "../../settings/app_settings.dart";

class SettingsScreen extends StatefulWidget {
  final SettingsController controller;
  final MemoryControls memoryControls;

  const SettingsScreen({
    super.key,
    required this.controller,
    required this.memoryControls,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late AppSettings s;

  @override
  void initState() {
    super.initState();
    s = widget.controller.value;
  }

  Future<void> _save(AppSettings next) async {
    await widget.controller.update(next);
    setState(() => s = next);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0x00000000),
      padding: const EdgeInsets.all(14),
      child: ListView(
        children: [
          _sectionTitle("Profile"),
          _textFieldRow(
            label: "Your name (optional)",
            value: s.displayName ?? "",
            hint: "Leave blank if you want",
            onChanged: (v) => _save(s.copyWith(displayName: v.trim().isEmpty ? null : v.trim())),
          ),
          _textFieldRow(
            label: "Persona name",
            value: s.personaName,
            hint: "Default: Arbor",
            onChanged: (v) => _save(s.copyWith(personaName: v.trim().isEmpty ? "Arbor" : v.trim())),
          ),
          const SizedBox(height: 18),

          _sectionTitle("Privacy & Consent"),
          _switchRow(
            title: "Memory",
            subtitle: "Allow Firefly to remember safe summaries to improve continuity.",
            value: s.memoryEnabled,
            onChanged: (v) => _save(s.copyWith(memoryEnabled: v)),
          ),
          _switchRow(
            title: "Ask before remembering important things",
            subtitle: "Recommended. Keeps memory consent explicit.",
            value: s.memoryConsentRequired,
            onChanged: (v) => _save(s.copyWith(memoryConsentRequired: v)),
          ),
          _switchRow(
            title: "Allow sensitive context (details omitted)",
            subtitle: "Stores only high-level context for difficult life events. Never graphic details.",
            value: s.allowSensitiveContext,
            onChanged: (v) => _save(s.copyWith(allowSensitiveContext: v)),
          ),
          const SizedBox(height: 10),
          _dangerButton(
            title: "Forget all memories",
            subtitle: "Deletes saved memory summaries and context.",
            onTap: () async {
              final ok = await _confirm(context,
                  title: "Forget all memories?",
                  body:
                      "This deletes all saved memory summaries. This can’t be undone.");
              if (ok != true) return;
              await widget.memoryControls.forgetAllMemories();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text("Memories cleared.")),
              );
            },
          ),
          const SizedBox(height: 18),

          _sectionTitle("Voice"),
          _switchRow(
            title: "Enable voice",
            subtitle: "Off by default. Voice is push-to-talk only.",
            value: s.voiceEnabled,
            onChanged: (v) => _save(s.copyWith(voiceEnabled: v)),
          ),
          _switchRow(
            title: "Push-to-talk only",
            subtitle: "Always on. Firefly never listens in the background.",
            value: true,
            onChanged: null, // locked
            locked: true,
          ),
          _switchRow(
            title: "Auto speak responses",
            subtitle: "Off by default. When off, voice output is user-triggered.",
            value: s.voiceAutoSpeak,
            onChanged: s.voiceEnabled ? (v) => _save(s.copyWith(voiceAutoSpeak: v)) : null,
            locked: !s.voiceEnabled,
          ),
          const SizedBox(height: 18),

          _sectionTitle("App"),
          _switchRow(
            title: "Usage tracking (for unlocks)",
            subtitle: "Needed to unlock Challenge and Criminology.",
            value: s.usageTrackingEnabled,
            onChanged: (v) => _save(s.copyWith(usageTrackingEnabled: v)),
          ),
          _dangerButton(
            title: "Reset settings to defaults",
            subtitle: "Does not delete chat history. Resets preferences.",
            onTap: () async {
              final ok = await _confirm(context,
                  title: "Reset settings?",
                  body: "This resets preferences to defaults.");
              if (ok != true) return;
              await widget.controller.resetToDefaults();
              setState(() => s = widget.controller.value);
            },
          ),
          const SizedBox(height: 30),

          _smallNote(
            "No gender fields. No pronouns required. "
            "Firefly is designed to respect privacy by default.",
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          text,
          style: TextStyle(
            color: Colors.white.withOpacity(0.85),
            fontSize: 14,
            fontWeight: FontWeight.w800,
          ),
        ),
      );

  Widget _smallNote(String text) => Padding(
        padding: const EdgeInsets.only(top: 10),
        child: Text(
          text,
          style: TextStyle(
            color: Colors.white.withOpacity(0.55),
            fontSize: 12.5,
            height: 1.25,
          ),
        ),
      );

  Widget _textFieldRow({
    required String label,
    required String value,
    required String hint,
    required ValueChanged<String> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: Colors.white.withOpacity(0.72))),
          const SizedBox(height: 6),
          TextField(
            controller: TextEditingController(text: value),
            onChanged: onChanged,
            style: TextStyle(color: Colors.white.withOpacity(0.90)),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: Colors.white.withOpacity(0.35)),
              filled: true,
              fillColor: const Color(0xFF14161B).withOpacity(0.70),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.10)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.10)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.16)),
              ),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
        ],
      ),
    );
  }

  Widget _switchRow({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool>? onChanged,
    bool locked = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF14161B).withOpacity(0.60),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.84),
                      fontWeight: FontWeight.w700,
                    )),
                const SizedBox(height: 4),
                Text(subtitle,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.55),
                      fontSize: 12.5,
                      height: 1.2,
                    )),
                if (locked)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      "Locked",
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.40),
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _dangerButton({
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFF14161B).withOpacity(0.60),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.10)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.90),
                  fontWeight: FontWeight.w800,
                )),
            const SizedBox(height: 4),
            Text(subtitle,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.55),
                  fontSize: 12.5,
                  height: 1.2,
                )),
          ],
        ),
      ),
    );
  }

  Future<bool?> _confirm(BuildContext context,
      {required String title, required String body}) {
    return showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF14161B),
        title: Text(title, style: const TextStyle(color: Colors.white)),
        content: Text(body, style: TextStyle(color: Colors.white.withOpacity(0.80))),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text("Cancel"),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text("OK"),
          ),
        ],
      ),
    );
  }
}




ArborWordmark(name: settingsController.value.personaName),


class MemoryItem {
  final String id;
  final String type; // person, pet, family, preference, trauma_context, etc
  final String summary; // safe summary only
  final bool detailsOmitted;
  final DateTime createdAt;

  const MemoryItem({
    required this.id,
    required this.type,
    required this.summary,
    required this.detailsOmitted,
    required this.createdAt,
  });

  factory MemoryItem.fromJson(Map<String, dynamic> json) {
    return MemoryItem(
      id: json["id"] as String,
      type: (json["type"] as String?) ?? "other",
      summary: (json["summary"] as String?) ?? "",
      detailsOmitted: (json["detailsOmitted"] as bool?) ?? false,
      createdAt: DateTime.tryParse((json["createdAt"] as String?) ?? "") ??
          DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        "id": id,
        "type": type,
        "summary": summary,
        "detailsOmitted": detailsOmitted,
        "createdAt": createdAt.toIso8601String(),
      };

  MemoryItem copyWith({
    String? summary,
  }) {
    return MemoryItem(
      id: id,
      type: type,
      summary: summary ?? this.summary,
      detailsOmitted: detailsOmitted,
      createdAt: createdAt,
    );
  }
}



import "dart:convert";
import "package:http/http.dart" as http;
import "memory_item.dart";

class MemoryApi {
  final String baseUrl; // e.g. https://your-domain.com
  final String? authToken;

  MemoryApi({required this.baseUrl, this.authToken});

  Map<String, String> _headers() {
    final h = <String, String>{
      "Content-Type": "application/json",
    };
    if (authToken != null && authToken!.isNotEmpty) {
      h["Authorization"] = "Bearer $authToken";
    }
    return h;
  }

  Future<List<MemoryItem>> listMemories({required String userId}) async {
    final uri = Uri.parse("$baseUrl/api/memory/list?userId=$userId");
    final res = await http.get(uri, headers: _headers());
    if (res.statusCode >= 400) {
      throw Exception("Failed to list memories: ${res.statusCode}");
    }
    final data = json.decode(res.body) as Map<String, dynamic>;
    final items = (data["items"] as List<dynamic>? ?? []);
    return items
        .map((e) => MemoryItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<MemoryItem> updateMemorySummary({
    required String userId,
    required String memoryId,
    required String summary,
  }) async {
    final uri = Uri.parse("$baseUrl/api/memory/update");
    final res = await http.post(
      uri,
      headers: _headers(),
      body: json.encode({
        "userId": userId,
        "memoryId": memoryId,
        "summary": summary,
      }),
    );
    if (res.statusCode >= 400) {
      throw Exception("Failed to update memory: ${res.statusCode}");
    }
    final data = json.decode(res.body) as Map<String, dynamic>;
    return MemoryItem.fromJson(data["item"] as Map<String, dynamic>);
  }

  Future<void> deleteMemory({
    required String userId,
    required String memoryId,
  }) async {
    final uri = Uri.parse("$baseUrl/api/memory/delete");
    final res = await http.post(
      uri,
      headers: _headers(),
      body: json.encode({
        "userId": userId,
        "memoryId": memoryId,
      }),
    );
    if (res.statusCode >= 400) {
      throw Exception("Failed to delete memory: ${res.statusCode}");
    }
  }
}



dependencies:
  http: ^1.2.2



import "package:flutter/material.dart";

Future<String?> showEditMemorySummaryModal({
  required BuildContext context,
  required String initialSummary,
  required bool detailsOmitted,
}) async {
  final controller = TextEditingController(text: initialSummary);

  return showDialog<String>(
    context: context,
    builder: (_) => AlertDialog(
      backgroundColor: const Color(0xFF14161B),
      title: const Text("Edit memory summary",
          style: TextStyle(color: Colors.white)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            detailsOmitted
                ? "This memory stores context only. Details stay omitted."
                : "Keep this short and factual.",
            style: TextStyle(color: Colors.white.withOpacity(0.70), fontSize: 12.5),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: controller,
            maxLines: 4,
            style: TextStyle(color: Colors.white.withOpacity(0.90)),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF0E0F12).withOpacity(0.6),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.10)),
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(null),
          child: const Text("Cancel"),
        ),
        TextButton(
          onPressed: () {
            final text = controller.text.trim();
            if (text.isEmpty) return;
            Navigator.of(context).pop(text);
          },
          child: const Text("Save"),
        ),
      ],
    ),
  );
}


import "package:flutter/material.dart";
import "../../memory/memory_api.dart";
import "../../memory/memory_item.dart";
import "../../memory/memory_edit_modal.dart";

class MemoryReviewScreen extends StatefulWidget {
  final MemoryApi api;
  final String userId;

  const MemoryReviewScreen({
    super.key,
    required this.api,
    required this.userId,
  });

  @override
  State<MemoryReviewScreen> createState() => _MemoryReviewScreenState();
}

class _MemoryReviewScreenState extends State<MemoryReviewScreen> {
  bool loading = true;
  String? error;
  List<MemoryItem> items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      final list = await widget.api.listMemories(userId: widget.userId);
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      setState(() {
        items = list;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  Future<void> _edit(MemoryItem item) async {
    final next = await showEditMemorySummaryModal(
      context: context,
      initialSummary: item.summary,
      detailsOmitted: item.detailsOmitted,
    );
    if (next == null) return;

    try {
      final updated = await widget.api.updateMemorySummary(
        userId: widget.userId,
        memoryId: item.id,
        summary: next,
      );
      setState(() {
        items = items.map((m) => m.id == item.id ? updated : m).toList();
      });
    } catch (e) {
      _snack("Couldn’t update memory.");
    }
  }

  Future<void> _delete(MemoryItem item) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF14161B),
        title: const Text("Delete memory?",
            style: TextStyle(color: Colors.white)),
        content: Text(
          "This removes the saved summary. This can’t be undone.",
          style: TextStyle(color: Colors.white.withOpacity(0.75)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text("Cancel"),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text("Delete"),
          ),
        ],
      ),
    );
    if (ok != true) return;

    try {
      await widget.api.deleteMemory(userId: widget.userId, memoryId: item.id);
      setState(() {
        items = items.where((m) => m.id != item.id).toList();
      });
      _snack("Memory deleted.");
    } catch (_) {
      _snack("Couldn’t delete memory.");
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0E0F12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0E0F12),
        title: const Text("Memory review"),
      ),
      body: Padding(
        padding: const EdgeInsets.all(14),
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : error != null
                ? _errorState()
                : _list(),
      ),
    );
  }

  Widget _errorState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            "Couldn’t load memories.",
            style: TextStyle(color: Colors.white.withOpacity(0.85)),
          ),
          const SizedBox(height: 8),
          Text(
            error!,
            style: TextStyle(color: Colors.white.withOpacity(0.45), fontSize: 12),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 14),
          TextButton(onPressed: _load, child: const Text("Retry")),
        ],
      ),
    );
  }

  Widget _list() {
    if (items.isEmpty) {
      return Center(
        child: Text(
          "No saved memories yet.",
          style: TextStyle(color: Colors.white.withOpacity(0.65)),
        ),
      );
    }

    return ListView.builder(
      itemCount: items.length,
      itemBuilder: (_, i) {
        final item = items[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF14161B).withOpacity(0.60),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    item.type.replaceAll("_", " "),
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.80),
                      fontWeight: FontWeight.w800,
                      fontSize: 12.5,
                    ),
                  ),
                  const Spacer(),
                  if (item.detailsOmitted)
                    Text(
                      "details omitted",
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.45),
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                item.summary,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.82),
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(
                    _formatDate(item.createdAt),
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.40),
                      fontSize: 12,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => _edit(item),
                    child: const Text("Edit"),
                  ),
                  TextButton(
                    onPressed: () => _delete(item),
                    child: const Text("Delete"),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatDate(DateTime d) {
    final mm = d.month.toString().padLeft(2, "0");
    final dd = d.day.toString().padLeft(2, "0");
    return "${d.year}-$mm-$dd";
  }
}




import "package:flutter/material.dart";
import "../../memory/memory_api.dart";
import "../../memory/memory_item.dart";
import "../../memory/memory_edit_modal.dart";

class MemoryReviewScreen extends StatefulWidget {
  final MemoryApi api;
  final String userId;

  const MemoryReviewScreen({
    super.key,
    required this.api,
    required this.userId,
  });

  @override
  State<MemoryReviewScreen> createState() => _MemoryReviewScreenState();
}

class _MemoryReviewScreenState extends State<MemoryReviewScreen> {
  bool loading = true;
  String? error;
  List<MemoryItem> items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      final list = await widget.api.listMemories(userId: widget.userId);
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      setState(() {
        items = list;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  Future<void> _edit(MemoryItem item) async {
    final next = await showEditMemorySummaryModal(
      context: context,
      initialSummary: item.summary,
      detailsOmitted: item.detailsOmitted,
    );
    if (next == null) return;

    try {
      final updated = await widget.api.updateMemorySummary(
        userId: widget.userId,
        memoryId: item.id,
        summary: next,
      );
      setState(() {
        items = items.map((m) => m.id == item.id ? updated : m).toList();
      });
    } catch (e) {
      _snack("Couldn’t update memory.");
    }
  }

  Future<void> _delete(MemoryItem item) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF14161B),
        title: const Text("Delete memory?",
            style: TextStyle(color: Colors.white)),
        content: Text(
          "This removes the saved summary. This can’t be undone.",
          style: TextStyle(color: Colors.white.withOpacity(0.75)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text("Cancel"),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text("Delete"),
          ),
        ],
      ),
    );
    if (ok != true) return;

    try {
      await widget.api.deleteMemory(userId: widget.userId, memoryId: item.id);
      setState(() {
        items = items.where((m) => m.id != item.id).toList();
      });
      _snack("Memory deleted.");
    } catch (_) {
      _snack("Couldn’t delete memory.");
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0E0F12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0E0F12),
        title: const Text("Memory review"),
      ),
      body: Padding(
        padding: const EdgeInsets.all(14),
        child: loading
            ? const Center(child: CircularProgressIndicator())
            : error != null
                ? _errorState()
                : _list(),
      ),
    );
  }

  Widget _errorState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            "Couldn’t load memories.",
            style: TextStyle(color: Colors.white.withOpacity(0.85)),
          ),
          const SizedBox(height: 8),
          Text(
            error!,
            style: TextStyle(color: Colors.white.withOpacity(0.45), fontSize: 12),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 14),
          TextButton(onPressed: _load, child: const Text("Retry")),
        ],
      ),
    );
  }

  Widget _list() {
    if (items.isEmpty) {
      return Center(
        child: Text(
          "No saved memories yet.",
          style: TextStyle(color: Colors.white.withOpacity(0.65)),
        ),
      );
    }

    return ListView.builder(
      itemCount: items.length,
      itemBuilder: (_, i) {
        final item = items[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF14161B).withOpacity(0.60),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    item.type.replaceAll("_", " "),
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.80),
                      fontWeight: FontWeight.w800,
                      fontSize: 12.5,
                    ),
                  ),
                  const Spacer(),
                  if (item.detailsOmitted)
                    Text(
                      "details omitted",
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.45),
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                item.summary,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.82),
                  height: 1.25,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(
                    _formatDate(item.createdAt),
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.40),
                      fontSize: 12,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: () => _edit(item),
                    child: const Text("Edit"),
                  ),
                  TextButton(
                    onPressed: () => _delete(item),
                    child: const Text("Delete"),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  String _formatDate(DateTime d) {
    final mm = d.month.toString().padLeft(2, "0");
    final dd = d.day.toString().padLeft(2, "0");
    return "${d.year}-$mm-$dd";
  }
}



// In SettingsScreen list
_dangerButton(
  title: "Review memories",
  subtitle: "View, edit, or delete saved summaries.",
  onTap: () {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MemoryReviewScreen(
          api: MemoryApi(baseUrl: "https://YOUR_BASE_URL"),
          userId: "CURRENT_USER_ID",
        ),
      ),
    );
  },
),


class ChatMessage {
  final String id;
  final String role; // "user" | "assistant"
  final String text;

  // Optional: when the assistant references or creates memory
  final String? memoryId;
  final String? memorySummaryPreview;
  final bool? memoryDetailsOmitted;

  const ChatMessage({
    required this.id,
    required this.role,
    required this.text,
    this.memoryId,
    this.memorySummaryPreview,
    this.memoryDetailsOmitted,
  });

  ChatMessage copyWith({
    String? memoryId,
    String? memorySummaryPreview,
    bool? memoryDetailsOmitted,
  }) {
    return ChatMessage(
      id: id,
      role: role,
      text: text,
      memoryId: memoryId ?? this.memoryId,
      memorySummaryPreview: memorySummaryPreview ?? this.memorySummaryPreview,
      memoryDetailsOmitted: memoryDetailsOmitted ?? this.memoryDetailsOmitted,
    );
  }
}



import "package:flutter/material.dart";
import "../memory/memory_api.dart";
import "../memory/memory_edit_modal.dart";

Future<void> showMemoryActionsSheet({
  required BuildContext context,
  required MemoryApi api,
  required String userId,
  required String memoryId,
  required String summaryPreview,
  required bool detailsOmitted,
  required VoidCallback onMemoryChanged, // refresh local state if needed
}) async {
  await showModalBottomSheet<void>(
    context: context,
    backgroundColor: const Color(0xFF14161B),
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
    ),
    builder: (_) {
      return Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 4,
              width: 44,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.18),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                "Memory controls",
                style: TextStyle(
                  color: Colors.white.withOpacity(0.90),
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                ),
              ),
            ),
            const SizedBox(height: 10),
            _card(
              title: "Summary",
              body: summaryPreview,
              detailsOmitted: detailsOmitted,
            ),
            const SizedBox(height: 12),
            _actionButton(
              label: "Edit summary",
              onTap: () async {
                Navigator.of(context).pop();
                final next = await showEditMemorySummaryModal(
                  context: context,
                  initialSummary: summaryPreview,
                  detailsOmitted: detailsOmitted,
                );
                if (next == null) return;
                await api.updateMemorySummary(
                  userId: userId,
                  memoryId: memoryId,
                  summary: next,
                );
                onMemoryChanged();
              },
            ),
            const SizedBox(height: 8),
            _actionButton(
              label: "Forget this memory",
              danger: true,
              onTap: () async {
                final ok = await _confirm(
                  context,
                  title: "Forget this memory?",
                  body: "This removes the saved summary. This can’t be undone.",
                );
                if (ok != true) return;
                Navigator.of(context).pop();
                await api.deleteMemory(userId: userId, memoryId: memoryId);
                onMemoryChanged();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      );
    },
  );
}

Widget _card({
  required String title,
  required String body,
  required bool detailsOmitted,
}) {
  return Container(
    width: double.infinity,
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: const Color(0xFF0E0F12).withOpacity(0.55),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: Colors.white.withOpacity(0.10)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(title,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.78),
                  fontWeight: FontWeight.w800,
                  fontSize: 12.5,
                )),
            const Spacer(),
            if (detailsOmitted)
              Text(
                "details omitted",
                style: TextStyle(
                  color: Colors.white.withOpacity(0.45),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          body,
          style: TextStyle(color: Colors.white.withOpacity(0.85), height: 1.25),
        ),
      ],
    ),
  );
}

Widget _actionButton({
  required String label,
  required VoidCallback onTap,
  bool danger = false,
}) {
  return GestureDetector(
    onTap: onTap,
    child: Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0E0F12).withOpacity(0.45),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: danger
              ? Colors.white.withOpacity(0.14)
              : Colors.white.withOpacity(0.10),
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: Colors.white.withOpacity(danger ? 0.90 : 0.82),
          fontWeight: FontWeight.w800,
        ),
      ),
    ),
  );
}

Future<bool?> _confirm(BuildContext context,
    {required String title, required String body}) {
  return showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      backgroundColor: const Color(0xFF14161B),
      title: Text(title, style: const TextStyle(color: Colors.white)),
      content: Text(body, style: TextStyle(color: Colors.white.withOpacity(0.80))),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text("Cancel"),
        ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: const Text("OK"),
        ),
      ],
    ),
  );
}



import "package:flutter/material.dart";

class MemoryChip extends StatelessWidget {
  final VoidCallback onTap;

  const MemoryChip({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(top: 8),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFF14161B).withOpacity(0.55),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: Colors.white.withOpacity(0.10)),
        ),
        child: Text(
          "Memory",
          style: TextStyle(
            color: Colors.white.withOpacity(0.72),
            fontWeight: FontWeight.w700,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}


if (msg.role == "assistant" && msg.memoryId != null) ...[
  MemoryChip(
    onTap: () {
      showMemoryActionsSheet(
        context: context,
        api: memoryApi,
        userId: userId,
        memoryId: msg.memoryId!,
        summaryPreview: msg.memorySummaryPreview ?? "(no summary)",
        detailsOmitted: msg.memoryDetailsOmitted ?? false,
        onMemoryChanged: () {
          // simplest: reload conversation or update local state
          setState(() {});
        },
      );
    },
  ),
]


{
  "assistantText": "...",
  "memory": {
    "id": "mem_123",
    "summary": "User referenced a past traumatic experience (details omitted).",
    "detailsOmitted": true
  }
}



class PendingMemory {
  final String id;
  final String summaryPreview;
  final bool detailsOmitted;
  final DateTime createdAt;

  const PendingMemory({
    required this.id,
    required this.summaryPreview,
    required this.detailsOmitted,
    required this.createdAt,
  });

  factory PendingMemory.fromJson(Map<String, dynamic> json) {
    return PendingMemory(
      id: json["id"] as String,
      summaryPreview: json["summaryPreview"] as String,
      detailsOmitted: (json["detailsOmitted"] as bool?) ?? false,
      createdAt: DateTime.parse(json["createdAt"] as String),
    );
  }
}


import "dart:convert";
import "package:http/http.dart" as http;
import "pending_memory.dart";

class PendingMemoryApi {
  final String baseUrl;
  final String? authToken;

  PendingMemoryApi({required this.baseUrl, this.authToken});

  Map<String, String> _headers() {
    final h = {"Content-Type": "application/json"};
    if (authToken != null) {
      h["Authorization"] = "Bearer $authToken";
    }
    return h;
  }

  Future<List<PendingMemory>> listPending(String userId) async {
    final res = await http.get(
      Uri.parse("$baseUrl/api/memory/pending?userId=$userId"),
      headers: _headers(),
    );
    final data = json.decode(res.body) as Map<String, dynamic>;
    final items = (data["items"] as List<dynamic>? ?? []);
    return items
        .map((e) => PendingMemory.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<void> approve({
    required String userId,
    required String pendingId,
    required String summary,
  }) async {
    await http.post(
      Uri.parse("$baseUrl/api/memory/approve"),
      headers: _headers(),
      body: json.encode({
        "userId": userId,
        "pendingId": pendingId,
        "summary": summary,
      }),
    );
  }

  Future<void> deny({
    required String userId,
    required String pendingId,
  }) async {
    await http.post(
      Uri.parse("$baseUrl/api/memory/deny"),
      headers: _headers(),
      body: json.encode({
        "userId": userId,
        "pendingId": pendingId,
      }),
    );
  }
}


import "package:flutter/material.dart";

class PendingBadge extends StatelessWidget {
  final int count;
  final VoidCallback onTap;

  const PendingBadge({
    super.key,
    required this.count,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const SizedBox.shrink();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFF14161B).withOpacity(0.60),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: Colors.white.withOpacity(0.12)),
        ),
        child: Text(
          "$count pending",
          style: TextStyle(
            color: Colors.white.withOpacity(0.80),
            fontWeight: FontWeight.w800,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}


import "package:flutter/material.dart";
import "../../memory/pending_memory.dart";
import "../../memory/pending_memory_api.dart";
import "../../memory/memory_edit_modal.dart";

class PendingMemoryScreen extends StatefulWidget {
  final PendingMemoryApi api;
  final String userId;

  const PendingMemoryScreen({
    super.key,
    required this.api,
    required this.userId,
  });

  @override
  State<PendingMemoryScreen> createState() => _PendingMemoryScreenState();
}

class _PendingMemoryScreenState extends State<PendingMemoryScreen> {
  bool loading = true;
  List<PendingMemory> items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    final list = await widget.api.listPending(widget.userId);
    setState(() {
      items = list;
      loading = false;
    });
  }

  Future<void> _approve(PendingMemory p) async {
    final summary = await showEditMemorySummaryModal(
      context: context,
      initialSummary: p.summaryPreview,
      detailsOmitted: p.detailsOmitted,
    );
    if (summary == null) return;

    await widget.api.approve(
      userId: widget.userId,
      pendingId: p.id,
      summary: summary,
    );
    _load();
  }

  Future<void> _deny(PendingMemory p) async {
    await widget.api.deny(
      userId: widget.userId,
      pendingId: p.id,
    );
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0E0F12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0E0F12),
        title: const Text("Pending memories"),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(14),
              itemCount: items.length,
              itemBuilder: (_, i) {
                final p = items[i];
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF14161B).withOpacity(0.60),
                    borderRadius: BorderRadius.circular(14),
                    border:
                        Border.all(color: Colors.white.withOpacity(0.10)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p.summaryPreview,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.85),
                        ),
                      ),
                      if (p.detailsOmitted)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(
                            "details omitted",
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.45),
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          TextButton(
                            onPressed: () => _approve(p),
                            child: const Text("Approve"),
                          ),
                          TextButton(
                            onPressed: () => _deny(p),
                            child: const Text("Don’t save"),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}



class CriminologyRules {
  // Anti-obsession regeneration gate:
  // User must accumulate this many *additional* Challenge hours before regen.
  static const int regenAdditionalChallengeHours = 25;

  // Optional hard limit for total generations (0 = unlimited with gate)
  static const int maxGenerations = 0;

  // Export policy: export safe summary only (never raw logs)
  static const bool allowExport = true;
}



class CriminologyStatus {
  final bool unlocked;
  final bool hasReport;
  final int generationCount;

  // For regen gate
  final int challengeSecondsTotal;
  final int challengeSecondsAtLastGeneration;

  const CriminologyStatus({
    required this.unlocked,
    required this.hasReport,
    required this.generationCount,
    required this.challengeSecondsTotal,
    required this.challengeSecondsAtLastGeneration,
  });

  factory CriminologyStatus.fromJson(Map<String, dynamic> json) {
    return CriminologyStatus(
      unlocked: (json["unlocked"] as bool?) ?? false,
      hasReport: (json["hasReport"] as bool?) ?? false,
      generationCount: (json["generationCount"] as int?) ?? 0,
      challengeSecondsTotal: (json["challengeSecondsTotal"] as int?) ?? 0,
      challengeSecondsAtLastGeneration:
          (json["challengeSecondsAtLastGeneration"] as int?) ?? 0,
    );
  }
}


import "criminology_rules.dart";
import "criminology_status.dart";

class CriminologyGateResult {
  final bool canGenerate;
  final String? reason; // for UI
  final Duration? timeRemaining; // optional

  const CriminologyGateResult({
    required this.canGenerate,
    this.reason,
    this.timeRemaining,
  });
}

class CriminologyGate {
  static CriminologyGateResult canGenerate(CriminologyStatus s) {
    if (!s.unlocked) {
      return const CriminologyGateResult(
        canGenerate: false,
        reason: "Locked until enough Challenge time is completed.",
      );
    }

    if (CriminologyRules.maxGenerations > 0 &&
        s.generationCount >= CriminologyRules.maxGenerations) {
      return const CriminologyGateResult(
        canGenerate: false,
        reason: "This report has reached its generation limit.",
      );
    }

    // First generation is allowed once unlocked
    if (!s.hasReport) {
      return const CriminologyGateResult(canGenerate: true);
    }

    // Regen requires additional challenge hours
    final requiredSeconds =
        CriminologyRules.regenAdditionalChallengeHours * 60 * 60;
    final delta = s.challengeSecondsTotal - s.challengeSecondsAtLastGeneration;

    if (delta >= requiredSeconds) {
      return const CriminologyGateResult(canGenerate: true);
    }

    final remaining = requiredSeconds - delta;
    return CriminologyGateResult(
      canGenerate: false,
      reason:
          "Regeneration is limited to prevent reassurance loops. Keep using Challenge and try again later.",
      timeRemaining: Duration(seconds: remaining),
    );
  }
}



import "dart:convert";
import "package:http/http.dart" as http;
import "criminology_status.dart";

class CriminologyApi {
  final String baseUrl;
  final String? authToken;

  CriminologyApi({required this.baseUrl, this.authToken});

  Map<String, String> _headers() {
    final h = {"Content-Type": "application/json"};
    if (authToken != null) h["Authorization"] = "Bearer $authToken";
    return h;
  }

  Future<CriminologyStatus> getStatus(String userId) async {
    final res = await http.get(
      Uri.parse("$baseUrl/api/criminology/status?userId=$userId"),
      headers: _headers(),
    );
    if (res.statusCode >= 400) {
      throw Exception("Failed criminology status");
    }
    final data = json.decode(res.body) as Map<String, dynamic>;
    return CriminologyStatus.fromJson(data);
  }

  Future<Map<String, dynamic>> generate(String userId) async {
    final res = await http.post(
      Uri.parse("$baseUrl/api/criminology/generate"),
      headers: _headers(),
      body: json.encode({"userId": userId}),
    );
    if (res.statusCode >= 400) {
      throw Exception("Failed to generate report");
    }
    return json.decode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> exportSafeSummary(String userId) async {
    final res = await http.get(
      Uri.parse("$baseUrl/api/criminology/export?userId=$userId"),
      headers: _headers(),
    );
    if (res.statusCode >= 400) {
      throw Exception("Failed to export report");
    }
    return json.decode(res.body) as Map<String, dynamic>;
  }
}




import "package:flutter/material.dart";
import "../../criminology/criminology_api.dart";
import "../../criminology/criminology_gate.dart";
import "../../criminology/criminology_status.dart";
import "../../ui/safety/safety_banner.dart";
import "../../ui/safety/banner_presets.dart";
import "../../ui/safety/banner_controller.dart";
import "../../criminology/criminology_rules.dart";

class CriminologyScreen extends StatefulWidget {
  final CriminologyApi api;
  final String userId;

  const CriminologyScreen({
    super.key,
    required this.api,
    required this.userId,
  });

  @override
  State<CriminologyScreen> createState() => _CriminologyScreenState();
}

class _CriminologyScreenState extends State<CriminologyScreen> {
  final banner = BannerController();
  bool loading = true;
  CriminologyStatus? status;
  String? error;

  Map<String, dynamic>? report; // safe report payload (render however you want)

  @override
  void initState() {
    super.initState();
    banner.show(BannerPresets.nonDiagnostic());
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final s = await widget.api.getStatus(widget.userId);
      setState(() {
        status = s;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  Future<void> _generate() async {
    final s = status;
    if (s == null) return;

    final gate = CriminologyGate.canGenerate(s);
    if (!gate.canGenerate) {
      _snack(gate.reason ?? "Not available yet.");
      return;
    }

    setState(() => loading = true);
    try {
      final data = await widget.api.generate(widget.userId);
      // Ideally backend returns updated status too
      await _load();
      setState(() {
        report = data["report"] as Map<String, dynamic>?;
        loading = false;
      });
    } catch (_) {
      setState(() => loading = false);
      _snack("Couldn’t generate report.");
    }
  }

  Future<void> _export() async {
    if (!CriminologyRules.allowExport) return;
    try {
      final data = await widget.api.exportSafeSummary(widget.userId);
      // TODO: share sheet / copy to clipboard / save file
      _snack("Export ready (wire share next).");
    } catch (_) {
      _snack("Couldn’t export report.");
    }
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final s = status;

    return Scaffold(
      backgroundColor: const Color(0xFF0E0F12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0E0F12),
        title: const Text("Criminology Report"),
        actions: [
          if (CriminologyRules.allowExport && s?.hasReport == true)
            IconButton(
              onPressed: _export,
              icon: const Icon(Icons.ios_share),
            ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            if (banner.hasBanner)
              SafetyBanner(
                data: banner.current!,
                onDismiss: banner.dismiss,
              ),
            Expanded(
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : error != null
                      ? _errorState()
                      : _content(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _errorState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text("Couldn’t load Criminology.",
              style: TextStyle(color: Colors.white.withOpacity(0.85))),
          const SizedBox(height: 8),
          Text(error ?? "",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white.withOpacity(0.45), fontSize: 12)),
          const SizedBox(height: 14),
          TextButton(onPressed: _load, child: const Text("Retry")),
        ],
      ),
    );
  }

  Widget _content() {
    final s = status!;
    final gate = CriminologyGate.canGenerate(s);

    if (!s.unlocked) {
      return Center(
        child: Text(
          "Locked. Complete the required Challenge time first.",
          style: TextStyle(color: Colors.white.withOpacity(0.70)),
        ),
      );
    }

    final buttonLabel = s.hasReport ? "Regenerate report" : "Generate report";

    return ListView(
      children: [
        _card(
          title: "Controls",
          body: s.hasReport
              ? "Regeneration is limited to prevent reassurance loops."
              : "Generate once unlocked. This is reflective, not diagnostic.",
        ),
        const SizedBox(height: 10),
        _primaryButton(
          label: buttonLabel,
          enabled: gate.canGenerate,
          onTap: _generate,
          helper: gate.canGenerate
              ? null
              : (gate.timeRemaining != null
                  ? "Available after more Challenge time."
                  : gate.reason),
        ),
        const SizedBox(height: 12),
        if (report != null) _renderReportPreview(report!),
      ],
    );
  }

  Widget _card({required String title, required String body}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF14161B).withOpacity(0.60),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: TextStyle(
                color: Colors.white.withOpacity(0.86),
                fontWeight: FontWeight.w900,
                fontSize: 13,
              )),
          const SizedBox(height: 6),
          Text(body,
              style: TextStyle(
                color: Colors.white.withOpacity(0.70),
                height: 1.25,
              )),
        ],
      ),
    );
  }

  Widget _primaryButton({
    required String label,
    required bool enabled,
    required VoidCallback onTap,
    String? helper,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF14161B).withOpacity(0.55),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: enabled ? onTap : null,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.white.withOpacity(enabled ? 0.92 : 0.40),
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          if (helper != null) ...[
            const SizedBox(height: 6),
            Text(helper,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.45),
                  fontSize: 12.5,
                )),
          ],
        ],
      ),
    );
  }

  Widget _renderReportPreview(Map<String, dynamic> data) {
    // Keep preview minimal to avoid fixation.
    final headline = (data["headline"] as String?) ?? "Report generated.";
    final note = (data["note"] as String?) ??
        "This is a reflective pattern summary, not a diagnosis.";

    return _card(title: "Preview", body: "$headline\n\n$note");
  }
}




class VoicePolicy {
  // Non-negotiables (hard locked)
  static const bool allowWakeWord = false;
  static const bool allowBackgroundListening = false;

  // Defaults
  static const bool defaultVoiceEnabled = false;
  static const bool defaultAutoSpeak = false;

  // Transcript storage policy
  static const bool storeVoiceTranscripts = false; // default OFF
}


import "package:flutter/material.dart";

class VoicePermissionScreen extends StatelessWidget {
  final Future<bool> Function() requestMicPermission;
  final VoidCallback onEnabled;
  final VoidCallback onSkip;

  const VoicePermissionScreen({
    super.key,
    required this.requestMicPermission,
    required this.onEnabled,
    required this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0E0F12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0E0F12),
        title: const Text("Voice"),
      ),
      body: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Voice is optional.",
              style: TextStyle(
                color: Colors.white.withOpacity(0.90),
                fontWeight: FontWeight.w900,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              "Firefly uses voice only when you press the mic button.\n"
              "• No wake words\n"
              "• No background listening\n"
              "• You can turn it off anytime",
              style: TextStyle(
                color: Colors.white.withOpacity(0.70),
                height: 1.3,
              ),
            ),
            const SizedBox(height: 18),
            _card(
              title: "Privacy",
              body:
                  "By default, Firefly does not store voice transcripts. "
                  "Voice is converted to text locally or via your platform’s speech services, "
                  "then treated like normal chat input.",
            ),
            const Spacer(),
            Row(
              children: [
                TextButton(
                  onPressed: onSkip,
                  child: const Text("Not now"),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () async {
                    final ok = await requestMicPermission();
                    if (ok) onEnabled();
                  },
                  child: const Text("Enable voice"),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _card({required String title, required String body}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF14161B).withOpacity(0.60),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.10)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: TextStyle(
                color: Colors.white.withOpacity(0.86),
                fontWeight: FontWeight.w900,
                fontSize: 13,
              )),
          const SizedBox(height: 6),
          Text(body,
              style: TextStyle(
                color: Colors.white.withOpacity(0.70),
                height: 1.25,
              )),
        ],
      ),
    );
  }
}



dependencies:
  permission_handler: ^11.3.1


import "package:permission_handler/permission_handler.dart";

Future<bool> requestMicrophonePermission() async {
  final status = await Permission.microphone.request();
  return status.isGranted;
}


enum VoiceMode { off, listening, speaking }

class VoiceController {
  VoiceMode mode = VoiceMode.off;

  // These are hooks for later integration with STT/TTS
  Future<void> startListening() async {
    mode = VoiceMode.listening;
  }

  Future<void> stopListening() async {
    mode = VoiceMode.off;
  }

  Future<void> speak(String text) async {
    mode = VoiceMode.speaking;
    // TODO: integrate TTS
    mode = VoiceMode.off;
  }
}


import "package:flutter/material.dart";

class PushToTalkButton extends StatelessWidget {
  final bool enabled;
  final VoidCallback onStart;
  final VoidCallback onStop;

  const PushToTalkButton({
    super.key,
    required this.enabled,
    required this.onStart,
    required this.onStop,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPressStart: enabled ? (_) => onStart() : null,
      onLongPressEnd: enabled ? (_) => onStop() : null,
      child: Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: const Color(0xFF14161B).withOpacity(enabled ? 0.70 : 0.35),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.10)),
        ),
        child: Icon(
          Icons.mic,
          color: Colors.white.withOpacity(enabled ? 0.85 : 0.35),
        ),
      ),
    );
  }
}


// Only show if settings.voiceEnabled
PushToTalkButton(
  enabled: settings.voiceEnabled,
  onStart: () async {
    // start STT
    await voiceController.startListening();
  },
  onStop: () async {
    // stop STT and insert transcript into text field
    await voiceController.stopListening();
    // TODO: setText(transcript)
  },
),


Future<void> maybeSpeakResponse({
  required String text,
  required bool voiceEnabled,
  required bool autoSpeak,
  required String mode, // "chat" | "challenge" | etc
  required VoiceController voice,
}) async {
  if (!voiceEnabled || !autoSpeak) return;
  if (mode == "bored" || mode == "reset") return; // optional: keep these quiet
  await voice.speak(text);
}


export type MemoryCategory =
  | "person"
  | "pet"
  | "family"
  | "significant_other"
  | "preference"
  | "routine"
  | "life_event"
  | "trauma_context"
  | "other"
  // hard-never-store buckets
  | "graphic_violence"
  | "explicit_sexual_content"
  | "self_harm_instructions"
  | "illegal_instruction"
  | "doxxing";

export type MemoryImportance = "low" | "medium" | "high" | "critical";

export type MemoryCandidate = {
  category: MemoryCategory;
  importance: MemoryImportance;
  summary: string; // SAFE summary only
  detailsOmitted: boolean;
  requireConsent: boolean;
  reasons: string[];
};

type ClassifyArgs = {
  text: string;
};

const NEVER_STORE: MemoryCategory[] = [
  "graphic_violence",
  "explicit_sexual_content",
  "self_harm_instructions",
  "illegal_instruction",
  "doxxing",
];

function lc(s: string) {
  return (s ?? "").toLowerCase();
}

function hasAny(text: string, list: string[]) {
  const t = lc(text);
  return list.some((x) => t.includes(x));
}

const TRAUMA_HINTS = [
  "abuse",
  "assault",
  "molest",
  "rape",
  "trauma",
  "ptsd",
  "violated",
  "groped",
  "coerced",
];

const DOXX_HINTS = ["address", "ssn", "social security", "credit card", "passport"];

const ILLEGAL_HINTS = ["how to hack", "steal", "fraud", "make a bomb", "poison"];

const SELF_HARM_HINTS = ["how to kill myself", "suicide method", "self harm method"];

const EXPLICIT_SEX_HINTS = ["porn", "explicit", "rape", "forced sex"];

const GRAPHIC_HINTS = ["dismember", "gore", "blood everywhere", "torture"];

const PET_HINTS = ["my dog", "my cat", "my puppy", "my kitty", "my pet"];
const FAMILY_HINTS = ["my mom", "my mother", "my dad", "my father", "my sister", "my brother", "my daughter", "my son"];
const PARTNER_HINTS = ["my husband", "my wife", "my partner", "my boyfriend", "my girlfriend"];

const PREF_HINTS = ["i like", "my favorite", "i prefer", "i hate", "i love", "i don't like"];

export function classifyMemoryCandidate(args: ClassifyArgs): MemoryCandidate | null {
  const text = (args.text ?? "").trim();
  if (!text) return null;

  // 1) Never-store detection (very conservative)
  if (hasAny(text, DOXX_HINTS)) {
    return {
      category: "doxxing",
      importance: "critical",
      summary: "Sensitive personal identifiers were mentioned (not stored).",
      detailsOmitted: true,
      requireConsent: false,
      reasons: ["never_store:doxxing"],
    };
  }
  if (hasAny(text, ILLEGAL_HINTS)) {
    return {
      category: "illegal_instruction",
      importance: "critical",
      summary: "Potential illegal instruction content was detected (not stored).",
      detailsOmitted: true,
      requireConsent: false,
      reasons: ["never_store:illegal_instruction"],
    };
  }
  if (hasAny(text, SELF_HARM_HINTS)) {
    return {
      category: "self_harm_instructions",
      importance: "critical",
      summary: "Potential self-harm instruction content was detected (not stored).",
      detailsOmitted: true,
      requireConsent: false,
      reasons: ["never_store:self_harm_instructions"],
    };
  }
  if (hasAny(text, EXPLICIT_SEX_HINTS)) {
    return {
      category: "explicit_sexual_content",
      importance: "critical",
      summary: "Explicit sexual content detected (not stored).",
      detailsOmitted: true,
      requireConsent: false,
      reasons: ["never_store:explicit_sexual_content"],
    };
  }
  if (hasAny(text, GRAPHIC_HINTS)) {
    return {
      category: "graphic_violence",
      importance: "critical",
      summary: "Graphic violence detected (not stored).",
      detailsOmitted: true,
      requireConsent: false,
      reasons: ["never_store:graphic_violence"],
    };
  }

  // 2) Trauma context (store context only, consent required)
  if (hasAny(text, TRAUMA_HINTS)) {
    return {
      category: "trauma_context",
      importance: "high",
      summary: "User referenced a difficult life experience (details intentionally omitted).",
      detailsOmitted: true,
      requireConsent: true,
      reasons: ["trauma_context"],
    };
  }

  // 3) People/pets/family/partner (usually high value)
  if (hasAny(text, PARTNER_HINTS)) {
    return {
      category: "significant_other",
      importance: "high",
      summary: "User mentioned their partner/spouse as an important person in their life.",
      detailsOmitted: false,
      requireConsent: true,
      reasons: ["partner_mention"],
    };
  }
  if (hasAny(text, FAMILY_HINTS)) {
    return {
      category: "family",
      importance: "high",
      summary: "User mentioned a close family member as part of their personal context.",
      detailsOmitted: false,
      requireConsent: true,
      reasons: ["family_mention"],
    };
  }
  if (hasAny(text, PET_HINTS)) {
    return {
      category: "pet",
      importance: "medium",
      summary: "User mentioned a pet as part of their life context.",
      detailsOmitted: false,
      requireConsent: false,
      reasons: ["pet_mention"],
    };
  }

  // 4) Preferences (medium unless clearly pivotal)
  if (hasAny(text, PREF_HINTS)) {
    return {
      category: "preference",
      importance: "medium",
      summary: "User expressed a preference (saved as a short summary).",
      detailsOmitted: false,
      requireConsent: false,
      reasons: ["preference_hint"],
    };
  }

  // 5) Default: don’t store
  return null;
}

export function isNeverStore(candidate: MemoryCandidate) {
  return NEVER_STORE.includes(candidate.category);
}





import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { classifyMemoryCandidate, isNeverStore } from "@/lib/memory/classifier";

const PENDING_TABLE = "memory_pending";

export async function POST(req: Request) {
  const { userId, sourceText } = (await req.json()) as {
    userId: string;
    sourceText: string;
  };

  if (!userId || !sourceText) {
    return NextResponse.json({ ok: false, error: "Missing userId/sourceText" }, { status: 400 });
  }

  const candidate = classifyMemoryCandidate({ text: sourceText });
  if (!candidate) {
    return NextResponse.json({ ok: true, created: false });
  }

  if (isNeverStore(candidate)) {
    // explicitly do not store
    return NextResponse.json({ ok: true, created: false, skipped: candidate.category });
  }

  // If consent not required, you can store directly in memory_items (optional)
  // For now: everything goes to pending when importance is high/trauma.
  const { data, error } = await supabaseAdmin
    .from(PENDING_TABLE)
    .insert({
      user_id: userId,
      summary_preview: candidate.summary,
      details_omitted: candidate.detailsOmitted,
      category: candidate.category,
      importance: candidate.importance,
      reasons: candidate.reasons,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    created: true,
    pending: {
      id: data.id,
      summaryPreview: data.summary_preview,
      detailsOmitted: data.details_omitted,
      createdAt: data.created_at,
    },
  });
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const PENDING_TABLE = "memory_pending";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from(PENDING_TABLE)
    .select("id, summary_preview, details_omitted, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    items: (data ?? []).map((r) => ({
      id: r.id,
      summaryPreview: r.summary_preview,
      detailsOmitted: r.details_omitted,
      createdAt: r.created_at,
    })),
  });
}



import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const PENDING_TABLE = "memory_pending";
const ITEMS_TABLE = "memory_items";

export async function POST(req: Request) {
  const { userId, pendingId, summary } = (await req.json()) as {
    userId: string;
    pendingId: string;
    summary: string;
  };

  if (!userId || !pendingId || !summary) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  // fetch pending
  const pendingRes = await supabaseAdmin
    .from(PENDING_TABLE)
    .select("*")
    .eq("id", pendingId)
    .eq("user_id", userId)
    .single();

  if (pendingRes.error || !pendingRes.data) {
    return NextResponse.json({ ok: false, error: "Pending item not found" }, { status: 404 });
  }

  const p = pendingRes.data;

  // insert final memory
  const insertRes = await supabaseAdmin
    .from(ITEMS_TABLE)
    .insert({
      user_id: userId,
      type: p.category,
      summary: summary.slice(0, 300),
      details_omitted: !!p.details_omitted,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertRes.error) {
    return NextResponse.json({ ok: false, error: insertRes.error.message }, { status: 500 });
  }

  // delete pending
  await supabaseAdmin.from(PENDING_TABLE).delete().eq("id", pendingId).eq("user_id", userId);

  return NextResponse.json({
    ok: true,
    item: {
      id: insertRes.data.id,
      type: insertRes.data.type,
      summary: insertRes.data.summary,
      detailsOmitted: insertRes.data.details_omitted,
      createdAt: insertRes.data.created_at,
    },
  });
}



import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const PENDING_TABLE = "memory_pending";

export async function POST(req: Request) {
  const { userId, pendingId } = (await req.json()) as { userId: string; pendingId: string };

  if (!userId || !pendingId) {
    return NextResponse.json({ ok: false, error: "Missing userId/pendingId" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from(PENDING_TABLE)
    .delete()
    .eq("id", pendingId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ITEMS_TABLE = "memory_items";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from(ITEMS_TABLE)
    .select("id, type, summary, details_omitted, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    items: (data ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      summary: r.summary,
      detailsOmitted: r.details_omitted,
      createdAt: r.created_at,
    })),
  });
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ITEMS_TABLE = "memory_items";

export async function POST(req: Request) {
  const { userId, memoryId, summary } = (await req.json()) as {
    userId: string;
    memoryId: string;
    summary: string;
  };

  if (!userId || !memoryId || !summary) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from(ITEMS_TABLE)
    .update({ summary: summary.slice(0, 300) })
    .eq("id", memoryId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    item: {
      id: data.id,
      type: data.type,
      summary: data.summary,
      detailsOmitted: data.details_omitted,
      createdAt: data.created_at,
    },
  });
}


export type MemoryCategory =
  | "person"
  | "pet"
  | "family"
  | "preference"
  | "routine"
  | "life_event"
  | "trauma_context"
  | "other"
  | "graphic_violence"
  | "explicit_sexual_content"
  | "self_harm_instructions"
  | "illegal_instruction"
  | "doxxing";

export type MemoryImportance = "low" | "medium" | "high" | "critical";

export type MemoryCandidate = {
  category: MemoryCategory;
  importance: MemoryImportance;
  summary: string; // safe summary only
  detailsOmitted?: boolean;
};

export type MemoryPending = {
  id: string;
  user_id: string;
  summary_preview: string;
  details_omitted: boolean;
  created_at: string;
};


import { MemoryCandidate } from "../memory/types";

const NEVER_STORE = new Set<MemoryCandidate["category"]>([
  "graphic_violence",
  "explicit_sexual_content",
  "self_harm_instructions",
  "illegal_instruction",
  "doxxing",
]);

export function sanitizeTraumaSummary(summary: string) {
  // conservative redaction
  return summary
    .replace(/(rape|gore|blood|dismember|torture)/gi, "[redacted]")
    .slice(0, 240);
}

export function memoryWriteGate(candidate: MemoryCandidate): {
  allow: boolean;
  requireConsent: boolean;
  sanitized?: MemoryCandidate;
  reason?: string;
} {
  if (NEVER_STORE.has(candidate.category)) {
    return { allow: false, requireConsent: false, reason: `never_store:${candidate.category}` };
  }

  // Trauma: context only, always consent
  if (candidate.category === "trauma_context") {
    const sanitized: MemoryCandidate = {
      ...candidate,
      detailsOmitted: true,
      summary: sanitizeTraumaSummary(candidate.summary),
      importance: candidate.importance === "low" ? "medium" : candidate.importance,
    };
    return { allow: true, requireConsent: true, sanitized };
  }

  // Consent for high+ by default
  const requireConsent = candidate.importance === "high" || candidate.importance === "critical";
  return { allow: true, requireConsent, sanitized: candidate };
}


import { MemoryCandidate } from "./types";

function hasAny(t: string, needles: string[]) {
  const s = t.toLowerCase();
  return needles.some((n) => s.includes(n));
}

export function classifyMemoryFromText(userText: string): MemoryCandidate | null {
  const t = userText.trim();
  if (!t) return null;

  // obvious doxxing / illegal / self-harm flags (candidate categories; gate will block)
  if (hasAny(t, ["address", "ssn", "social security", "passport number"])) {
    return { category: "doxxing", importance: "critical", summary: "User shared identifying info." };
  }
  if (hasAny(t, ["how to hack", "steal", "fraud", "make a bomb"])) {
    return { category: "illegal_instruction", importance: "critical", summary: "User requested illegal instructions." };
  }
  if (hasAny(t, ["kill myself", "suicide", "self harm", "cut myself"])) {
    return { category: "self_harm_instructions", importance: "critical", summary: "User expressed self-harm intent." };
  }

  // trauma-context heuristic: high-level only
  if (hasAny(t, ["assault", "abuse", "trauma", "molested", "violated", "violent"])) {
    return {
      category: "trauma_context",
      importance: "high",
      summary: "User referenced a painful/traumatic past event (details omitted).",
      detailsOmitted: true,
    };
  }

  // preferences
  if (hasAny(t, ["my favorite", "i prefer", "i hate", "i love"])) {
    return { category: "preference", importance: "medium", summary: t.slice(0, 200) };
  }

  // people/pets/family keywords (you can improve with entity extraction later)
  if (hasAny(t, ["my husband", "my wife", "my daughter", "my son", "my mom", "my dad"])) {
    return { category: "family", importance: "high", summary: t.slice(0, 200) };
  }

  // default: do not store
  return null;
}



import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { classifyMemoryFromText } from "@/../package/memory/classifier";
import { memoryWriteGate } from "@/../package/safety/memoryGate";

export async function POST(req: Request) {
  const { userId, userText } = (await req.json()) as { userId: string; userText: string };

  const candidate = classifyMemoryFromText(userText);
  if (!candidate) {
    return NextResponse.json({ ok: true, queued: false });
  }

  const gate = memoryWriteGate(candidate);
  if (!gate.allow) {
    return NextResponse.json({ ok: true, queued: false, blocked: gate.reason });
  }

  const c = gate.sanitized!;
  if (!gate.requireConsent) {
    // save immediately
    const ins = await supabaseAdmin
      .from("memory_items")
      .insert({
        user_id: userId,
        category: c.category,
        summary: c.summary,
        details_omitted: !!c.detailsOmitted,
      })
      .select()
      .single();

    if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      queued: false,
      saved: true,
      memory: {
        id: ins.data.id,
        summary: ins.data.summary,
        detailsOmitted: ins.data.details_omitted,
      },
    });
  }

  // queue for consent
  const pending = await supabaseAdmin
    .from("memory_pending")
    .insert({
      user_id: userId,
      category: c.category,
      summary_preview: c.summary,
      details_omitted: !!c.detailsOmitted,
    })
    .select()
    .single();

  if (pending.error) return NextResponse.json({ ok: false, error: pending.error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    queued: true,
    pending: {
      id: pending.data.id,
      summaryPreview: pending.data.summary_preview,
      detailsOmitted: pending.data.details_omitted,
    },
  });
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ ok: false, error: "missing userId" }, { status: 400 });

  const q = await supabaseAdmin
    .from("memory_pending")
    .select("id,user_id,summary_preview,details_omitted,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (q.error) return NextResponse.json({ ok: false, error: q.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, items: q.data });
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { memoryWriteGate } from "@/../package/safety/memoryGate";

export async function POST(req: Request) {
  const { userId, pendingId, summary } = (await req.json()) as {
    userId: string;
    pendingId: string;
    summary: string;
  };

  const p = await supabaseAdmin
    .from("memory_pending")
    .select("*")
    .eq("id", pendingId)
    .eq("user_id", userId)
    .single();

  if (p.error) return NextResponse.json({ ok: false, error: p.error.message }, { status: 500 });

  // Safety gate again (never trust client)
  const gate = memoryWriteGate({
    category: p.data.category,
    importance: "high",
    summary,
    detailsOmitted: !!p.data.details_omitted,
  });

  if (!gate.allow) {
    // deny + delete pending
    await supabaseAdmin.from("memory_pending").delete().eq("id", pendingId).eq("user_id", userId);
    return NextResponse.json({ ok: true, saved: false, blocked: gate.reason });
  }

  const c = gate.sanitized!;
  const ins = await supabaseAdmin
    .from("memory_items")
    .insert({
      user_id: userId,
      category: c.category,
      summary: c.summary,
      details_omitted: !!c.detailsOmitted,
    })
    .select()
    .single();

  if (ins.error) return NextResponse.json({ ok: false, error: ins.error.message }, { status: 500 });

  // delete pending once saved
  await supabaseAdmin.from("memory_pending").delete().eq("id", pendingId).eq("user_id", userId);

  return NextResponse.json({
    ok: true,
    saved: true,
    item: {
      id: ins.data.id,
      summary: ins.data.summary,
      detailsOmitted: ins.data.details_omitted,
    },
  });
}



import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { userId, pendingId } = (await req.json()) as { userId: string; pendingId: string };

  const del = await supabaseAdmin.from("memory_pending").delete().eq("id", pendingId).eq("user_id", userId);
  if (del.error) return NextResponse.json({ ok: false, error: del.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, denied: true });
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ ok: false, error: "missing userId" }, { status: 400 });

  const q = await supabaseAdmin
    .from("memory_items")
    .select("id,user_id,category,summary,details_omitted,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (q.error) return NextResponse.json({ ok: false, error: q.error.message }, { status: 500 });

  const items = q.data.map((r: any) => ({
    id: r.id,
    type: r.category,
    summary: r.summary,
    detailsOmitted: r.details_omitted,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ ok: true, items });
}


import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { memoryWriteGate } from "@/../package/safety/memoryGate";

export async function POST(req: Request) {
  const { userId, memoryId, summary } = (await req.json()) as {
    userId: string;
    memoryId: string;
    summary: string;
  };

  // fetch existing to preserve category/details_omitted
  const existing = await supabaseAdmin
    .from("memory_items")
    .select("id,user_id,category,details_omitted")
    .eq("id", memoryId)
    .eq("user_id", userId)
    .single();

  if (existing.error) return NextResponse.json({ ok: false, error: existing.error.message }, { status: 500 });

  const gate = memoryWriteGate({
    category: existing.data.category,
    importance: "high",
    summary,
    detailsOmitted: !!existing.data.details_omitted,
  });

  if (!gate.allow) return NextResponse.json({ ok: false, error: gate.reason }, { status: 400 });

  const upd = await supabaseAdmin
    .from("memory_items")
    .update({ summary: gate.sanitized!.summary })
    .eq("id", memoryId)
    .eq("user_id", userId)
    .select()
    .single();

  if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    item: {
      id: upd.data.id,
      type: upd.data.category,
      summary: upd.data.summary,
      detailsOmitted: upd.data.details_omitted,
      createdAt: upd.data.created_at,
    },
  });
}



import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { userId, memoryId } = (await req.json()) as { userId: string; memoryId: string };

  const del = await supabaseAdmin.from("memory_items").delete().eq("id", memoryId).eq("user_id", userId);
  if (del.error) return NextResponse.json({ ok: false, error: del.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: true });
}



export const UNLOCKS = {
  challengeAfterChatHours: 50,
  criminologyAfterChallengeHours: 50,
} as const;

export type UnlockStatus = {
  chatSeconds: number;
  challengeSeconds: number;
  challengeUnlocked: boolean;
  criminologyUnlocked: boolean;
  chatHours: number; // convenience
  challengeHours: number; // convenience
};

export function computeUnlockStatus(args: {
  chatSeconds: number;
  challengeSeconds: number;
}): UnlockStatus {
  const chatHours = args.chatSeconds / 3600;
  const challengeHours = args.challengeSeconds / 3600;

  const challengeUnlocked = chatHours >= UNLOCKS.challengeAfterChatHours;
  const criminologyUnlocked =
    challengeUnlocked && challengeHours >= UNLOCKS.criminologyAfterChallengeHours;

  return {
    chatSeconds: args.chatSeconds,
    challengeSeconds: args.challengeSeconds,
    chatHours,
    challengeHours,
    challengeUnlocked,
    criminologyUnlocked,
  };
}



export type Mode = "chat" | "bored" | "reset" | "challenge" | "criminology";

export const TICK_POLICY = {
  // Only these modes count toward unlocks
  countTowardUnlocks: new Set<Mode>(["chat", "challenge"]),

  // Client sends a delta; cap it.
  // Example: if you tick every 30–60s, cap at 120s to prevent abuse.
  maxDeltaSecondsPerTick: 120,

  // Optional: ignore tiny pings
  minDeltaSecondsPerTick: 5,
} as const;

export function normalizeDelta(delta: number): number {
  if (!Number.isFinite(delta)) return 0;
  const d = Math.floor(delta);
  if (d < TICK_POLICY.minDeltaSecondsPerTick) return 0;
  return Math.min(d, TICK_POLICY.maxDeltaSecondsPerTick);
}



import { supabaseAdmin } from "@/lib/supabase/admin";

export type ProgressRow = {
  user_id: string;
  chat_seconds: number;
  challenge_seconds: number;
  updated_at: string;
};

export async function getOrCreateProgress(userId: string): Promise<ProgressRow> {
  const existing = await supabaseAdmin
    .from("user_progress")
    .select("user_id,chat_seconds,challenge_seconds,updated_at")
    .eq("user_id", userId)
    .single();

  if (!existing.error && existing.data) return existing.data as ProgressRow;

  const created = await supabaseAdmin
    .from("user_progress")
    .insert({
      user_id: userId,
      chat_seconds: 0,
      challenge_seconds: 0,
    })
    .select("user_id,chat_seconds,challenge_seconds,updated_at")
    .single();

  if (created.error) throw new Error(created.error.message);
  return created.data as ProgressRow;
}

export async function addSeconds(args: {
  userId: string;
  addChatSeconds: number;
  addChallengeSeconds: number;
}): Promise<ProgressRow> {
  // Read current
  const row = await getOrCreateProgress(args.userId);

  const nextChat = Math.max(0, (row.chat_seconds ?? 0) + (args.addChatSeconds ?? 0));
  const nextChallenge =
    Math.max(0, (row.challenge_seconds ?? 0) + (args.addChallengeSeconds ?? 0));

  const upd = await supabaseAdmin
    .from("user_progress")
    .update({
      chat_seconds: nextChat,
      challenge_seconds: nextChallenge,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", args.userId)
    .select("user_id,chat_seconds,challenge_seconds,updated_at")
    .single();

  if (upd.error) throw new Error(upd.error.message);
  return upd.data as ProgressRow;
}



import { NextResponse } from "next/server";
import { getOrCreateProgress } from "@/lib/progress/progressRepo";
import { computeUnlockStatus } from "@/../package/progress/unlocks";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ ok: false, error: "missing userId" }, { status: 400 });
  }

  const row = await getOrCreateProgress(userId);

  const status = computeUnlockStatus({
    chatSeconds: row.chat_seconds ?? 0,
    challengeSeconds: row.challenge_seconds ?? 0,
  });

  return NextResponse.json({ ok: true, status });
}


import { NextResponse } from "next/server";
import { addSeconds } from "@/lib/progress/progressRepo";
import { computeUnlockStatus } from "@/../package/progress/unlocks";
import { TICK_POLICY, normalizeDelta } from "@/../package/progress/tickPolicy";

type TickBody = {
  userId: string;
  mode: "chat" | "bored" | "reset" | "challenge" | "criminology";
  deltaSeconds: number;
};

export async function POST(req: Request) {
  const body = (await req.json()) as TickBody;

  if (!body.userId) {
    return NextResponse.json({ ok: false, error: "missing userId" }, { status: 400 });
  }

  const delta = normalizeDelta(body.deltaSeconds);

  // If delta is too small/invalid, still return current status-ish
  if (delta <= 0) {
    return NextResponse.json({ ok: true, applied: 0 });
  }

  let addChat = 0;
  let addChallenge = 0;

  // Count only chat + challenge
  if (TICK_POLICY.countTowardUnlocks.has(body.mode)) {
    if (body.mode === "chat") addChat = delta;
    if (body.mode === "challenge") addChallenge = delta;
  }

  const row = await addSeconds({
    userId: body.userId,
    addChatSeconds: addChat,
    addChallengeSeconds: addChallenge,
  });

  const status = computeUnlockStatus({
    chatSeconds: row.chat_seconds ?? 0,
    challengeSeconds: row.challenge_seconds ?? 0,
  });

  return NextResponse.json({
    ok: true,
    applied: delta,
    counted: { chat: addChat, challenge: addChallenge },
    status,
  });
}


import "dart:convert";
import "package:http/http.dart" as http;

class ProgressApi {
  final String baseUrl;
  final String? authToken;

  ProgressApi({required this.baseUrl, this.authToken});

  Map<String, String> _headers() {
    final h = {"Content-Type": "application/json"};
    if (authToken != null) h["Authorization"] = "Bearer $authToken";
    return h;
  }

  Future<Map<String, dynamic>> status(String userId) async {
    final res = await http.get(
      Uri.parse("$baseUrl/api/progress/status?userId=$userId"),
      headers: _headers(),
    );
    return json.decode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> tick({
    required String userId,
    required String mode, // "chat" | "challenge" etc
    required int deltaSeconds,
  }) async {
    final res = await http.post(
      Uri.parse("$baseUrl/api/progress/tick"),
      headers: _headers(),
      body: json.encode({
        "userId": userId,
        "mode": mode,
        "deltaSeconds": deltaSeconds,
      }),
    );
    return json.decode(res.body) as Map<String, dynamic>;
  }
}


import "dart:convert";
import "package:http/http.dart" as http;

class ProgressApi {
  final String baseUrl;
  final String? authToken;

  ProgressApi({required this.baseUrl, this.authToken});

  Map<String, String> _headers() {
    final h = {"Content-Type": "application/json"};
    if (authToken != null) h["Authorization"] = "Bearer $authToken";
    return h;
  }

  Future<Map<String, dynamic>> status(String userId) async {
    final res = await http.get(
      Uri.parse("$baseUrl/api/progress/status?userId=$userId"),
      headers: _headers(),
    );
    return json.decode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> tick({
    required String userId,
    required String mode, // "chat" | "challenge" etc
    required int deltaSeconds,
  }) async {
    final res = await http.post(
      Uri.parse("$baseUrl/api/progress/tick"),
      headers: _headers(),
      body: json.encode({
        "userId": userId,
        "mode": mode,
        "deltaSeconds": deltaSeconds,
      }),
    );
    return json.decode(res.body) as Map<String, dynamic>;
  }
}


import { getOrCreateProgress } from "@/lib/progress/progressRepo";
import { computeUnlockStatus } from "@/../package/progress/unlocks";

export type Mode = "chat" | "bored" | "reset" | "challenge" | "criminology";

export type UnlockEnforcement =
  | { allowed: true; status: ReturnType<typeof computeUnlockStatus> }
  | {
      allowed: false;
      status: ReturnType<typeof computeUnlockStatus>;
      blockedMode: Mode;
      reason: string;
      suggestedMode: "chat" | "reset";
    };

export async function enforceModeUnlocks(userId: string, mode: Mode): Promise<UnlockEnforcement> {
  const row = await getOrCreateProgress(userId);
  const status = computeUnlockStatus({
    chatSeconds: row.chat_seconds ?? 0,
    challengeSeconds: row.challenge_seconds ?? 0,
  });

  if (mode === "challenge" && !status.challengeUnlocked) {
    return {
      allowed: false,
      status,
      blockedMode: mode,
      reason: "Challenge is locked until enough normal chat time is completed.",
      suggestedMode: "chat",
    };
  }

  if (mode === "criminology" && !status.criminologyUnlocked) {
    return {
      allowed: false,
      status,
      blockedMode: mode,
      reason: "Criminology is locked until enough Challenge time is completed.",
      suggestedMode: "chat",
    };
  }

  // Other modes are always allowed
  return { allowed: true, status };
}



import { NextResponse } from "next/server";
import { enforceModeUnlocks, type Mode } from "@/lib/progress/enforceUnlocks";

// If you already have these imports, keep yours:
import { supabaseAdmin } from "@/lib/supabase/admin";
// import { yourChatFunction } from "@/lib/chat/whatever";

type ChatBody = {
  userId: string;
  conversationId?: string;
  mode?: Mode; // IMPORTANT
  message: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;

  if (!body.userId) {
    return NextResponse.json({ ok: false, error: "missing userId" }, { status: 400 });
  }
  if (!body.message || !body.message.trim()) {
    return NextResponse.json({ ok: false, error: "missing message" }, { status: 400 });
  }

  const mode: Mode = body.mode ?? "chat";

  // ✅ SERVER-SIDE ENFORCEMENT
  const gate = await enforceModeUnlocks(body.userId, mode);

  if (!gate.allowed) {
    // return a consistent blocked payload so UI can show banner/modal
    return NextResponse.json({
      ok: true,
      blocked: true,
      blockedMode: gate.blockedMode,
      reason: gate.reason,
      suggestedMode: gate.suggestedMode,
      unlocks: gate.status,
      assistantText:
        gate.suggestedMode === "reset"
          ? "Let’s steady your system first. Want to do a quick Reset?"
          : "That mode isn’t unlocked yet. We can keep going in normal chat for now.",
    });
  }

  // At this point mode is allowed
  // ---------------------------------------------
  // CALL YOUR EXISTING CHAT PIPELINE HERE
  // ---------------------------------------------

  // Example placeholder (replace with your actual chat logic):
  const assistantText = `(${mode}) ${body.message}`; // <-- replace

  // OPTIONAL: you can still do memory queueing/classifier in allowed modes only
  // e.g. skip memory extraction in "bored" if you want

  return NextResponse.json({
    ok: true,
    blocked: false,
    unlocks: gate.status,
    mode,
    assistantText,
  });
}


{
  "ok": true,
  "blocked": true,
  "blockedMode": "challenge",
  "reason": "Challenge is locked until enough normal chat time is completed.",
  "suggestedMode": "chat",
  "unlocks": {
    "chatSeconds": 1200,
    "challengeSeconds": 0,
    "chatHours": 0.333,
    "challengeHours": 0,
    "challengeUnlocked": false,
    "criminologyUnlocked": false
  },
  "assistantText": "That mode isn’t unlocked yet. We can keep going in normal chat for now."
}


export type Mode = "chat" | "bored" | "reset" | "challenge" | "criminology";

export type Intent =
  | "normal_chat"
  | "bored_content"
  | "reset"
  | "challenge_session"
  | "criminology_report";


import type { Intent, Mode } from "./modes";

export const INTENT_MODE: Record<Intent, Mode> = {
  normal_chat: "chat",
  bored_content: "bored",
  reset: "reset",
  challenge_session: "challenge",
  criminology_report: "criminology",
} as const;

export function intentMatchesMode(intent: Intent, mode: Mode) {
  return INTENT_MODE[intent] === mode;
}


import type { Intent, Mode } from "@/../package/progress/modes";
import { intentMatchesMode } from "@/../package/progress/intentPolicy";
import { enforceModeUnlocks } from "./enforceUnlocks";

export type EnforcementResult =
  | { allowed: true; status: any } // status is UnlockStatus
  | {
      allowed: false;
      status: any;
      blockedMode: Mode;
      blockedIntent?: Intent;
      reason: string;
      suggestedMode: "chat" | "reset";
      code:
        | "LOCKED_MODE"
        | "INTENT_MODE_MISMATCH"
        | "INTENT_REQUIRES_UNLOCK";
    };

export async function enforceModeAndIntent(args: {
  userId: string;
  mode: Mode;
  intent: Intent;
}): Promise<EnforcementResult> {
  // 1) Intent must match declared mode
  if (!intentMatchesMode(args.intent, args.mode)) {
    // If user is trying to do something else, route them to the required mode.
    const requiredMode = (() => {
      switch (args.intent) {
        case "challenge_session":
          return "challenge";
        case "criminology_report":
          return "criminology";
        case "reset":
          return "reset";
        case "bored_content":
          return "bored";
        default:
          return "chat";
      }
    })();

    // Enforce unlock for the required mode (important)
    const gate = await enforceModeUnlocks(args.userId, requiredMode as Mode);

    if (!gate.allowed) {
      return {
        allowed: false,
        status: gate.status,
        blockedMode: requiredMode as Mode,
        blockedIntent: args.intent,
        reason: gate.reason,
        suggestedMode: gate.suggestedMode,
        code: "INTENT_REQUIRES_UNLOCK",
      };
    }

    return {
      allowed: false,
      status: gate.status,
      blockedMode: requiredMode as Mode,
      blockedIntent: args.intent,
      reason: `That action requires ${requiredMode} mode.`,
      suggestedMode: "chat",
      code: "INTENT_MODE_MISMATCH",
    };
  }

  // 2) Mode must be unlocked (existing enforcement)
  const gate = await enforceModeUnlocks(args.userId, args.mode);
  if (!gate.allowed) {
    return {
      allowed: false,
      status: gate.status,
      blockedMode: gate.blockedMode,
      reason: gate.reason,
      suggestedMode: gate.suggestedMode,
      code: "LOCKED_MODE",
    };
  }

  return { allowed: true, status: gate.status };
}



import { NextResponse } from "next/server";
import type { Mode, Intent } from "@/../package/progress/modes";
import { enforceModeAndIntent } from "@/lib/progress/enforceModeAndIntent";

type ChatBody = {
  userId: string;
  conversationId?: string;
  mode?: Mode;
  intent?: Intent; // ✅ REQUIRED for mode-specific actions
  message: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;

  if (!body.userId) {
    return NextResponse.json({ ok: false, error: "missing userId" }, { status: 400 });
  }
  if (!body.message || !body.message.trim()) {
    return NextResponse.json({ ok: false, error: "missing message" }, { status: 400 });
  }

  const mode: Mode = body.mode ?? "chat";
  const intent: Intent = body.intent ?? "normal_chat";

  const gate = await enforceModeAndIntent({
    userId: body.userId,
    mode,
    intent,
  });

  if (!gate.allowed) {
    return NextResponse.json({
      ok: true,
      blocked: true,
      blockedMode: gate.blockedMode,
      blockedIntent: gate.blockedIntent ?? intent,
      code: gate.code,
      reason: gate.reason,
      suggestedMode: gate.suggestedMode,
      unlocks: gate.status,
      assistantText:
        gate.code === "INTENT_MODE_MISMATCH"
          ? `That belongs in ${gate.blockedMode} mode. Want me to switch you there?`
          : "That isn’t available yet. We can keep going in normal chat for now.",
    });
  }

  // ✅ Allowed: run the pipeline for the declared mode+intent
  // Replace with your real chat logic:
  const assistantText = `(${mode}/${intent}) ${body.message}`;

  return NextResponse.json({
    ok: true,
    blocked: false,
    unlocks: gate.status,
    mode,
    intent,
    assistantText,
  });
}


export const DATA_POLICY = {
  // Chat message retention
  storeChatMessages: true, // if false: only keep session context in-memory
  storeAssistantMessages: true,
  storeUserMessages: true,

  // Memory retention
  storeMemories: true, // summaries only
  storeTraumaDetails: false, // never
  storeVoiceTranscripts: false, // default: never

  // Reports
  storeCriminologyReports: true, // store generated report output
  storeRawChallengeTranscriptsInReport: false, // never export raw logs by default

  // Export/Delete
  allowExport: true,
  allowDeleteAll: true,

  // Safety note to display in app
  userFacingSummary: [
    "Firefly stores chat messages to continue conversations (you can delete).",
    "Memories are saved only as short summaries you approve.",
    "Sensitive/trauma content is stored as context only—no graphic details.",
    "Voice is push-to-talk and transcripts are not stored by default.",
    "You can review/edit/delete memories anytime.",
  ],
} as const;

export type DataPolicy = typeof DATA_POLICY;



import { NextResponse } from "next/server";
import { DATA_POLICY } from "@/../package/policy/dataPolicy";

export async function GET() {
  return NextResponse.json({ ok: true, policy: DATA_POLICY });
}



import { supabaseAdmin } from "@/lib/supabase/admin";

export type AuthedUser = { userId: string };

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function requireUser(req: Request): Promise<AuthedUser> {
  const token = getBearerToken(req);
  if (!token) throw new Error("AUTH_MISSING_BEARER");

  // Supabase admin can validate the JWT and return the user
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new Error("AUTH_INVALID_TOKEN");

  return { userId: data.user.id };
}



import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getOrCreateProgress } from "@/lib/progress/progressRepo";
import { computeUnlockStatus } from "@/../package/progress/unlocks";

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser(req);

    const row = await getOrCreateProgress(userId);
    const status = computeUnlockStatus({
      chatSeconds: row.chat_seconds ?? 0,
      challengeSeconds: row.challenge_seconds ?? 0,
    });

    return NextResponse.json({ ok: true, status });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const code = msg.startsWith("AUTH_") ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}



create table if not exists rate_limit_buckets (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create or replace function increment_rate_limit(p_key text, p_window_seconds int)
returns int
language plpgsql
as $$
declare
  current_count int;
begin
  insert into rate_limit_buckets(key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
      when rate_limit_buckets.window_start < now() - make_interval(secs => p_window_seconds)
        then 1
      else rate_limit_buckets.count + 1
    end,
    window_start = case
      when rate_limit_buckets.window_start < now() - make_interval(secs => p_window_seconds)
        then now()
      else rate_limit_buckets.window_start
    end
  returning count into current_count;

  return current_count;
end;
$$;


import { supabaseAdmin } from "@/lib/supabase/admin";

export type RateLimitConfig = {
  windowSeconds: number; // e.g. 60
  maxHits: number; // e.g. 30
  scope: string; // e.g. "chat" | "tick" | "memory"
};

export async function rateLimitOrThrow(args: {
  userId: string;
  config: RateLimitConfig;
}): Promise<void> {
  const key = `${args.config.scope}:${args.userId}`;
  const { data, error } = await supabaseAdmin.rpc("increment_rate_limit", {
    p_key: key,
    p_window_seconds: args.config.windowSeconds,
  });

  if (error) throw new Error(`RATE_LIMIT_RPC:${error.message}`);

  const count = Number(data);
  if (count > args.config.maxHits) {
    throw new Error(`RATE_LIMIT_EXCEEDED:${args.config.scope}`);
  }
}



import { rateLimitOrThrow } from "@/lib/rateLimit/rateLimit";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser(req);

    await rateLimitOrThrow({
      userId,
      config: { scope: "tick", windowSeconds: 60, maxHits: 90 }, // ~1.5/sec max
    });

    // ...existing tick logic (use auth userId)
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.startsWith("RATE_LIMIT_EXCEEDED")) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}



import { supabaseAdmin } from "@/lib/supabase/admin";

export type AuthedUser = { userId: string; isDevBypass?: boolean };

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

// Only allow bypass for local development.
// DO NOT allow for Vercel preview/prod.
function isLocalDev(req: Request): boolean {
  const host = (req.headers.get("host") || "").toLowerCase();
  const origin = (req.headers.get("origin") || "").toLowerCase();

  const localHost =
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1:") ||
    host.startsWith("0.0.0.0:");

  const localOrigin =
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("http://0.0.0.0:");

  return localHost || localOrigin;
}

/**
 * DevBypass rules:
 * - If running on localhost AND header "x-dev-user-id" is present, accept it.
 * - Otherwise require a valid Supabase Bearer token.
 */
export async function requireUser(req: Request): Promise<AuthedUser> {
  const token = getBearerToken(req);

  // ✅ DevBypass: localhost only + explicit header
  if (!token && isLocalDev(req)) {
    const devUserId = req.headers.get("x-dev-user-id");
    if (devUserId && devUserId.trim().length > 10) {
      return { userId: devUserId.trim(), isDevBypass: true };
    }
  }

  if (!token) throw new Error("AUTH_MISSING_BEARER");

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new Error("AUTH_INVALID_TOKEN");

  return { userId: data.user.id };
}


headers: {
  "Content-Type": "application/json",
  "x-dev-user-id": "YOUR_USER_UUID",
}



withAuth(req, handler)


import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

export async function withAuth<T>(
  req: Request,
  fn: (ctx: { userId: string; isDevBypass: boolean }) => Promise<T>
) {
  try {
    const u = await requireUser(req);
    const data = await fn({ userId: u.userId, isDevBypass: !!u.isDevBypass });
    return NextResponse.json({ ok: true, ...((data as any) ?? {}) });
  } catch (e: any) {
    const msg = String(e?.message || e);

    if (msg.startsWith("AUTH_")) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Rate limit support if you want unified errors
    if (msg.startsWith("RATE_LIMIT_EXCEEDED")) {
      return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


import { rateLimitOrThrow, type RateLimitConfig } from "@/lib/rateLimit/rateLimit";

export async function enforceRateLimit(args: {
  userId: string;
  config: RateLimitConfig;
}) {
  await rateLimitOrThrow({ userId: args.userId, config: args.config });
}


import { withAuth } from "@/lib/http/withAuth";
import { enforceRateLimit } from "@/lib/http/withRateLimit";
import type { Mode, Intent } from "@/../package/progress/modes";
import { enforceModeAndIntent } from "@/lib/progress/enforceModeAndIntent";

type ChatBody = {
  conversationId?: string;
  mode?: Mode;
  intent?: Intent;
  message: string;
};

export async function POST(req: Request) {
  return withAuth(req, async ({ userId }) => {
    await enforceRateLimit({
      userId,
      config: { scope: "chat", windowSeconds: 60, maxHits: 60 },
    });

    const body = (await req.json()) as ChatBody;
    const mode: Mode = body.mode ?? "chat";
    const intent: Intent = body.intent ?? "normal_chat";

    const gate = await enforceModeAndIntent({ userId, mode, intent });

    if (!gate.allowed) {
      return {
        blocked: true,
        blockedMode: gate.blockedMode,
        blockedIntent: gate.blockedIntent ?? intent,
        code: gate.code,
        reason: gate.reason,
        suggestedMode: gate.suggestedMode,
        unlocks: gate.status,
        assistantText:
          gate.code === "INTENT_MODE_MISMATCH"
            ? `That action belongs in ${gate.blockedMode} mode.`
            : "That isn’t available yet. We can keep going in normal chat.",
      };
    }

    // TODO: replace with your real LLM pipeline
    const assistantText = `(${mode}/${intent}) ${body.message}`;

    return {
      blocked: false,
      mode,
      intent,
      unlocks: gate.status,
      assistantText,
    };
  });
}


import { withAuth } from "@/lib/http/withAuth";
import { enforceRateLimit } from "@/lib/http/withRateLimit";
import { addSeconds } from "@/lib/progress/progressRepo";
import { computeUnlockStatus } from "@/../package/progress/unlocks";
import { normalizeDelta } from "@/../package/progress/tickPolicy";

type TickBody = {
  mode: "chat" | "bored" | "reset" | "challenge" | "criminology";
  deltaSeconds: number;
};

export async function POST(req: Request) {
  return withAuth(req, async ({ userId }) => {
    await enforceRateLimit({
      userId,
      config: { scope: "tick", windowSeconds: 60, maxHits: 90 },
    });

    const body = (await req.json()) as TickBody;
    const delta = normalizeDelta(body.deltaSeconds);

    let addChat = 0;
    let addChallenge = 0;

    if (body.mode === "chat") addChat = delta;
    if (body.mode === "challenge") addChallenge = delta;

    const row = await addSeconds({
      userId,
      addChatSeconds: addChat,
      addChallengeSeconds: addChallenge,
    });

    const status = computeUnlockStatus({
      chatSeconds: row.chat_seconds ?? 0,
      challengeSeconds: row.challenge_seconds ?? 0,
    });

    return {
      applied: delta,
      counted: { chat: addChat, challenge: addChallenge },
      status,
    };
  });
}


import { withAuth } from "@/lib/http/withAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  return withAuth(req, async ({ userId }) => {
    const q = await supabaseAdmin
      .from("memory_items")
      .select("id,category,summary,details_omitted,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (q.error) throw new Error(q.error.message);

    const items = (q.data ?? []).map((r: any) => ({
      id: r.id,
      type: r.category,
      summary: r.summary,
      detailsOmitted: r.details_omitted,
      createdAt: r.created_at,
    }));

    return { items };
  });
}


import { withAuth } from "@/lib/http/withAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { memoryWriteGate } from "@/../package/safety/memoryGate";

type Body = { memoryId: string; summary: string };

export async function POST(req: Request) {
  return withAuth(req, async ({ userId }) => {
    const body = (await req.json()) as Body;

    const existing = await supabaseAdmin
      .from("memory_items")
      .select("id,category,details_omitted")
      .eq("id", body.memoryId)
      .eq("user_id", userId)
      .single();

    if (existing.error) throw new Error(existing.error.message);

    const gate = memoryWriteGate({
      category: existing.data.category,
      importance: "high",
      summary: body.summary,
      detailsOmitted: !!existing.data.details_omitted,
    });

    if (!gate.allow) {
      return { error: gate.reason };
    }

    const upd = await supabaseAdmin
      .from("memory_items")
      .update({ summary: gate.sanitized!.summary })
      .eq("id", body.memoryId)
      .eq("user_id", userId)
      .select("id,category,summary,details_omitted,created_at")
      .single();

    if (upd.error) throw new Error(upd.error.message);

    return {
      item: {
        id: upd.data.id,
        type: upd.data.category,
        summary: upd.data.summary,
        detailsOmitted: upd.data.details_omitted,
        createdAt: upd.data.created_at,
      },
    };
  });
}



import { withAuth } from "@/lib/http/withAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Body = { memoryId: string };

export async function POST(req: Request) {
  return withAuth(req, async ({ userId }) => {
    const body = (await req.json()) as Body;

    const del = await supabaseAdmin
      .from("memory_items")
      .delete()
      .eq("id", body.memoryId)
      .eq("user_id", userId);

    if (del.error) throw new Error(del.error.message);

    return { deleted: true };
  });
}



export type CrisisLevel = "none" | "low" | "medium" | "high";

export type CrisisResource = {
  label: string;
  detail: string;
  action: "call" | "text" | "link";
  value: string;
};

export const CRISIS_RESOURCES_US: CrisisResource[] = [
  { label: "988 Suicide & Crisis Lifeline", detail: "Call or text 988 (US)", action: "call", value: "988" },
  { label: "988 Suicide & Crisis Lifeline", detail: "Text 988 (US)", action: "text", value: "988" },
  { label: "Emergency services", detail: "If you’re in immediate danger, call your local emergency number", action: "call", value: "911" },
];

export const CRISIS_RESOURCES_GENERIC: CrisisResource[] = [
  {
    label: "Find local crisis resources",
    detail: "If you’re outside the US, use your country’s crisis hotline directory",
    action: "link",
    value: "https://www.opencounseling.com/suicide-hotlines",
  },
  {
    label: "Emergency services",
    detail: "If you’re in immediate danger, call your local emergency number",
    action: "call",
    value: "local",
  },
];

export const CRISIS_POLICY = {
  // If true, we will override normal mode/intent and return crisis response.
  hardOverrideOnHigh: true,

  // If true, we will suggest Reset mode (de-escalation) when medium/high.
  suggestResetOnMediumPlus: true,

  // Store NOTHING extra in audit beyond: level + timestamp + blocked flag
  avoidLoggingUserText: true,
} as const;



import type { CrisisLevel } from "./crisisPolicy";

function hasAny(s: string, needles: string[]) {
  const t = s.toLowerCase();
  return needles.some((n) => t.includes(n));
}

export function detectCrisisLevel(userText: string): { level: CrisisLevel; reason: string } {
  const t = (userText || "").toLowerCase().trim();
  if (!t) return { level: "none", reason: "empty" };

  // High: explicit intent or plan-ish language
  if (
    hasAny(t, [
      "i want to die",
      "i'm going to kill myself",
      "im going to kill myself",
      "suicide",
      "end my life",
      "can't go on",
      "no reason to live",
      "i will hurt myself",
      "i'm going to hurt myself",
      "im going to hurt myself",
    ])
  ) {
    return { level: "high", reason: "explicit_self_harm_intent" };
  }

  // Medium: passive ideation / hopelessness (still serious)
  if (
    hasAny(t, [
      "wish i was dead",
      "wish i weren't here",
      "better off without me",
      "i can't do this anymore",
      "i can't take it",
      "i want it to stop",
      "nothing matters",
    ])
  ) {
    return { level: "medium", reason: "passive_ideation_or_hopelessness" };
  }

  // Low: distress keywords without ideation
  if (hasAny(t, ["panic attack", "spiraling", "overwhelmed", "breaking down", "can't breathe"])) {
    return { level: "low", reason: "acute_distress" };
  }

  return { level: "none", reason: "no_match" };
}



import type { CrisisLevel, CrisisResource } from "./crisisPolicy";
import { CRISIS_RESOURCES_GENERIC, CRISIS_RESOURCES_US } from "./crisisPolicy";

export function buildCrisisPayload(args: {
  level: CrisisLevel;
  locale?: string; // "en-US", etc
}): { assistantText: string; resources: CrisisResource[]; suggestedMode: "reset" | "chat" } {
  const isUS = (args.locale || "").toLowerCase().includes("us");

  const resources = isUS ? CRISIS_RESOURCES_US : CRISIS_RESOURCES_GENERIC;

  if (args.level === "high") {
    return {
      suggestedMode: "reset",
      assistantText:
        "I’m really sorry you’re feeling this way. I can’t help with anything that would hurt you.\n\n" +
        "If you’re in immediate danger or might act on these thoughts, please call your local emergency number right now.\n" +
        "If you can, reach out to a trusted person nearby and don’t stay alone.\n\n" +
        "If you want, tell me: are you in immediate danger right now?",
      resources,
    };
  }

  if (args.level === "medium") {
    return {
      suggestedMode: "reset",
      assistantText:
        "I’m really glad you said something. I can’t provide anything that supports self-harm, but I can stay with you and help you slow things down.\n\n" +
        "If you feel at risk of hurting yourself, please contact local emergency services or a crisis line.\n\n" +
        "Do you feel safe right now, or do you feel like you might act on it?",
      resources,
    };
  }

  // Low (distress): gentle grounding suggestion without “therapy framing”
  return {
    suggestedMode: "reset",
    assistantText:
      "That sounds heavy. Let’s slow it down for a minute.\n\n" +
      "Try this: unclench your jaw, drop your shoulders, and take one slow breath in… and out.\n" +
      "If you want, tell me what’s happening in one sentence—just the headline.",
    resources,
  };
}




import { detectCrisisLevel } from "@/../package/safety/crisisDetect";
import { buildCrisisPayload } from "@/../package/safety/crisisTemplates";
import { CRISIS_POLICY } from "@/../package/safety/crisisPolicy";

export function enforceCrisis(args: {
  userText: string;
  locale?: string;
}):
  | { blocked: false }
  | {
      blocked: true;
      crisis: { level: string; reason: string };
      assistantText: string;
      resources: any[];
      suggestedMode: "reset" | "chat";
    } {
  const d = detectCrisisLevel(args.userText);

  if (d.level === "none") return { blocked: false };

  const payload = buildCrisisPayload({ level: d.level, locale: args.locale });

  // Medium and high should override normal operation
  if (d.level === "high" || d.level === "medium" || CRISIS_POLICY.hardOverrideOnHigh) {
    return {
      blocked: true,
      crisis: { level: d.level, reason: d.reason },
      assistantText: payload.assistantText,
      resources: payload.resources,
      suggestedMode: payload.suggestedMode,
    };
  }

  // Low distress can also override if you want — currently we still block for safety.
  return {
    blocked: true,
    crisis: { level: d.level, reason: d.reason },
    assistantText: payload.assistantText,
    resources: payload.resources,
    suggestedMode: payload.suggestedMode,
  };
}


import { enforceCrisis } from "@/lib/safety/enforceCrisis";

// ...inside POST handler, after reading body.message:

const locale = req.headers.get("x-locale") || req.headers.get("accept-language") || "en";
const crisis = enforceCrisis({ userText: body.message, locale });

if (crisis.blocked) {
  // Return consistent payload for UI (banner + reset prompt + resources button)
  return {
    blocked: true,
    code: "CRISIS_OVERRIDE",
    reason: "crisis_detected",
    crisis: crisis.crisis,
    suggestedMode: crisis.suggestedMode,
    assistantText: crisis.assistantText,
    resources: crisis.resources,
  };
}



{
  "ok": true,
  "blocked": true,
  "code": "CRISIS_OVERRIDE",
  "crisis": { "level": "high", "reason": "explicit_self_harm_intent" },
  "suggestedMode": "reset",
  "assistantText": "...",
  "resources": [{ "label": "...", "action": "call", "value": "988" }]
}



create table if not exists audit_events (
  id bigserial primary key,
  user_id text not null,
  event_type text not null,
  mode text,
  intent text,
  code text,
  level text,
  reason text,
  blocked boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_user_time_idx
  on audit_events (user_id, created_at desc);

create index if not exists audit_events_type_idx
  on audit_events (event_type, created_at desc);


import { supabaseAdmin } from "@/lib/supabase/admin";

export type AuditEvent = {
  userId: string;

  eventType:
    | "CHAT_REQUEST"
    | "CHAT_BLOCKED_UNLOCK"
    | "CHAT_BLOCKED_INTENT_MISMATCH"
    | "CHAT_BLOCKED_RATE_LIMIT"
    | "CRISIS_OVERRIDE"
    | "PROGRESS_TICK"
    | "MEMORY_QUEUED"
    | "MEMORY_APPROVED"
    | "MEMORY_DENIED"
    | "MEMORY_DELETED"
    | "CRIMINOLOGY_GENERATE"
    | "CRIMINOLOGY_EXPORT";

  mode?: string;
  intent?: string;

  blocked: boolean;
  code?: string; // e.g. "LOCKED_MODE", "CRISIS_OVERRIDE"
  level?: string; // e.g. crisis level
  reason?: string; // short reason
  meta?: Record<string, any>; // safe fields only
};

export async function logEvent(e: AuditEvent): Promise<void> {
  // Privacy guard: never allow raw text
  if (e.meta) {
    for (const k of Object.keys(e.meta)) {
      const lk = k.toLowerCase();
      if (lk.includes("message") || lk.includes("text") || lk.includes("prompt") || lk.includes("content")) {
        throw new Error("AUDIT_META_FORBIDDEN_FIELD");
      }
    }
  }

  const ins = await supabaseAdmin.from("audit_events").insert({
    user_id: e.userId,
    event_type: e.eventType,
    mode: e.mode ?? null,
    intent: e.intent ?? null,
    code: e.code ?? null,
    level: e.level ?? null,
    reason: e.reason ?? null,
    blocked: e.blocked,
    meta: e.meta ?? {},
  });

  if (ins.error) {
    // Do not crash user flows if audit fails
    // but do surface in server logs
    console.error("audit log error:", ins.error.message);
  }
}





import { logEvent } from "@/lib/audit/logEvent";
import { enforceCrisis } from "@/lib/safety/enforceCrisis";


await logEvent({
  userId,
  eventType: "CHAT_REQUEST",
  mode,
  intent,
  blocked: false,
  meta: { hasConversationId: !!body.conversationId },
});


if (crisis.blocked) {
  await logEvent({
    userId,
    eventType: "CRISIS_OVERRIDE",
    mode,
    intent,
    blocked: true,
    code: "CRISIS_OVERRIDE",
    level: crisis.crisis.level,
    reason: crisis.crisis.reason,
    meta: {},
  });

  return {
    blocked: true,
    code: "CRISIS_OVERRIDE",
    reason: "crisis_detected",
    crisis: crisis.crisis,
    suggestedMode: crisis.suggestedMode,
    assistantText: crisis.assistantText,
    resources: crisis.resources,
  };
}


if (!gate.allowed) {
  await logEvent({
    userId,
    eventType:
      gate.code === "INTENT_MODE_MISMATCH"
        ? "CHAT_BLOCKED_INTENT_MISMATCH"
        : "CHAT_BLOCKED_UNLOCK",
    mode,
    intent,
    blocked: true,
    code: gate.code,
    reason: gate.reason,
    meta: {
      blockedMode: gate.blockedMode,
      suggestedMode: gate.suggestedMode,
    },
  });

  return {
    blocked: true,
    blockedMode: gate.blockedMode,
    blockedIntent: gate.blockedIntent ?? intent,
    code: gate.code,
    reason: gate.reason,
    suggestedMode: gate.suggestedMode,
    unlocks: gate.status,
    assistantText:
      gate.code === "INTENT_MODE_MISMATCH"
        ? `That action belongs in ${gate.blockedMode} mode.`
        : "That isn’t available yet. We can keep going in normal chat.",
  };
}



// inside the catch in withAuth:
if (msg.startsWith("RATE_LIMIT_EXCEEDED")) {
  // best-effort log if we can decode the user (optional)
  return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
}


import { logEvent } from "@/lib/audit/logEvent";



await logEvent({
  userId,
  eventType: "PROGRESS_TICK",
  mode: body.mode,
  blocked: false,
  meta: {
    appliedSeconds: delta,
    addChatSeconds: addChat,
    addChallengeSeconds: addChallenge,
  },
});



await logEvent({
  userId,
  eventType: "MEMORY_APPROVED",
  blocked: false,
  meta: { pendingId, savedMemoryId: ins.data.id, category: ins.data.category },
});


await logEvent({
  userId,
  eventType: "MEMORY_DENIED",
  blocked: false,
  meta: { pendingId },
});


await logEvent({
  userId,
  eventType: "MEMORY_DELETED",
  blocked: false,
  meta: { memoryId },
});

-- 1) Track minutes spent per mode (chat, bored, challenge, criminology)
create table if not exists public.user_progress (
  user_id uuid primary key,
  chat_minutes int not null default 0,
  challenge_minutes int not null default 0,
  bored_minutes int not null default 0,
  criminology_unlocked boolean not null default false,
  challenge_unlocked boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 2) Append-only activity events (anti-cheat & analytics)
create table if not exists public.activity_events (
  id bigserial primary key,
  user_id uuid not null,
  mode text not null check (mode in ('chat','bored','challenge','criminology')),
  event_type text not null check (event_type in ('session_start','session_heartbeat','session_end')),
  session_id uuid not null,
  client_ts timestamptz,
  server_ts timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_activity_events_user_time
  on public.activity_events(user_id, server_ts desc);

create index if not exists idx_activity_events_session
  on public.activity_events(session_id);

-- 3) Safety events (non-diagnostic, just routing + audit)
create table if not exists public.safety_events (
  id bigserial primary key,
  user_id uuid not null,
  conversation_id uuid,
  severity text not null check (severity in ('low','medium','high')),
  category text not null,
  server_ts timestamptz not null default now(),
  excerpt text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_safety_events_user_time
  on public.safety_events(user_id, server_ts desc);

-- Seed row helper (optional)
create or replace function public.ensure_user_progress(p_user_id uuid)
returns void as $$
begin
  insert into public.user_progress(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$ language plpgsql;

-- RLS (tight default)
alter table public.user_progress enable row level security;
alter table public.activity_events enable row level security;
alter table public.safety_events enable row level security;

-- Allow users to read/write ONLY their own rows
create policy "progress_select_own" on public.user_progress
for select using (auth.uid() = user_id);

create policy "progress_update_own" on public.user_progress
for update using (auth.uid() = user_id);

create policy "activity_insert_own" on public.activity_events
for insert with check (auth.uid() = user_id);

create policy "activity_select_own" on public.activity_events
for select using (auth.uid() = user_id);

create policy "safety_select_own" on public.safety_events
for select using (auth.uid() = user_id);

create policy "safety_insert_own" on public.safety_events
for insert with check (auth.uid() = user_id);



export type Mode = "chat" | "bored" | "challenge" | "criminology";

export const UNLOCK_RULES = {
  // 50 hours chat to unlock Challenge
  challenge: { requiresMode: "chat" as const, minutesRequired: 50 * 60 },
  // 50 hours challenge to unlock Criminology
  criminology: { requiresMode: "challenge" as const, minutesRequired: 50 * 60 },
} as const;

export function isModeUnlocked(args: {
  mode: Mode;
  chatMinutes: number;
  challengeMinutes: number;
  boredMinutes: number;
  criminologyUnlocked: boolean;
  challengeUnlocked: boolean;
}) {
  const { mode } = args;

  if (mode === "chat" || mode === "bored") return true;
  if (mode === "challenge") return args.challengeUnlocked;
  if (mode === "criminology") return args.criminologyUnlocked;
  return false;
}

export function computeUnlocks(progress: {
  chat_minutes: number;
  challenge_minutes: number;
  bored_minutes: number;
  challenge_unlocked: boolean;
  criminology_unlocked: boolean;
}) {
  const challengeUnlocked =
    progress.challenge_unlocked ||
    progress.chat_minutes >= UNLOCK_RULES.challenge.minutesRequired;

  const criminologyUnlocked =
    progress.criminology_unlocked ||
    (challengeUnlocked &&
      progress.challenge_minutes >= UNLOCK_RULES.criminology.minutesRequired);

  return { challengeUnlocked, criminologyUnlocked };
}



import { createClient } from "@supabase/supabase-js";
import { computeUnlocks, isModeUnlocked, type Mode } from "@firefly/shared/unlocks/rules";

function minutesBetween(a: Date, b: Date) {
  const ms = Math.max(0, b.getTime() - a.getTime());
  // round down to whole minutes to discourage spam
  return Math.floor(ms / 60000);
}

export async function enforceAndAccrueMinutes(args: {
  supabaseUrl: string;
  supabaseServiceKey: string;
  userId: string;
  mode: Mode;
  sessionId: string; // uuid from client
  eventType: "session_start" | "session_heartbeat" | "session_end";
  clientTs?: string; // ISO
  // optional: do not count more than X minutes per heartbeat window
  maxAccrualPerEventMinutes?: number;
}) {
  const sb = createClient(args.supabaseUrl, args.supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // Ensure progress row exists
  await sb.rpc("ensure_user_progress", { p_user_id: args.userId });

  // Load progress
  const { data: progress, error: progErr } = await sb
    .from("user_progress")
    .select("*")
    .eq("user_id", args.userId)
    .single();

  if (progErr || !progress) throw new Error(`progress_load_failed: ${progErr?.message}`);

  const unlocks = computeUnlocks(progress);
  const unlocked = isModeUnlocked({
    mode: args.mode,
    chatMinutes: progress.chat_minutes,
    challengeMinutes: progress.challenge_minutes,
    boredMinutes: progress.bored_minutes,
    challengeUnlocked: unlocks.challengeUnlocked,
    criminologyUnlocked: unlocks.criminologyUnlocked,
  });

  if (!unlocked) {
    // log attempt for abuse auditing
    await sb.from("activity_events").insert({
      user_id: args.userId,
      mode: args.mode,
      event_type: args.eventType,
      session_id: args.sessionId,
      client_ts: args.clientTs ?? null,
      meta: { blocked: true, reason: "mode_locked" },
    });

    return {
      ok: false as const,
      reason: "MODE_LOCKED" as const,
      unlocks,
      progress,
    };
  }

  // Insert activity event
  await sb.from("activity_events").insert({
    user_id: args.userId,
    mode: args.mode,
    event_type: args.eventType,
    session_id: args.sessionId,
    client_ts: args.clientTs ?? null,
  });

  // Accrue minutes only on heartbeat/end (not on start)
  if (args.eventType === "session_start") {
    return { ok: true as const, unlocks, progress };
  }

  // Find the previous server event for this session to compute minutes
  const { data: prevEvents } = await sb
    .from("activity_events")
    .select("server_ts")
    .eq("user_id", args.userId)
    .eq("session_id", args.sessionId)
    .order("server_ts", { ascending: false })
    .limit(2);

  const now = new Date();
  const prev = prevEvents?.[1]?.server_ts ? new Date(prevEvents[1].server_ts) : null;
  const rawMinutes = prev ? minutesBetween(prev, now) : 0;

  const maxPer = args.maxAccrualPerEventMinutes ?? 10; // cap per event
  const minutesToAdd = Math.min(rawMinutes, maxPer);

  if (minutesToAdd <= 0) {
    return { ok: true as const, unlocks, progress };
  }

  const col =
    args.mode === "chat"
      ? "chat_minutes"
      : args.mode === "challenge"
      ? "challenge_minutes"
      : args.mode === "bored"
      ? "bored_minutes"
      : null;

  // criminology mode should NOT accrue progress by default (optional)
  if (!col) return { ok: true as const, unlocks, progress };

  const updated = {
    ...progress,
    [col]: (progress as any)[col] + minutesToAdd,
  };

  const nextUnlocks = computeUnlocks(updated as any);

  const { data: saved, error: saveErr } = await sb
    .from("user_progress")
    .update({
      [col]: (progress as any)[col] + minutesToAdd,
      challenge_unlocked: nextUnlocks.challengeUnlocked,
      criminology_unlocked: nextUnlocks.criminologyUnlocked,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", args.userId)
    .select("*")
    .single();

  if (saveErr || !saved) throw new Error(`progress_update_failed: ${saveErr?.message}`);

  return {
    ok: true as const,
    minutesAdded: minutesToAdd,
    unlocks: nextUnlocks,
    progress: saved,
  };
}


import { NextRequest, NextResponse } from "next/server";
import { enforceAndAccrueMinutes } from "@/lib/unlocks/enforce";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = body.userId as string;
    const mode = body.mode as "chat" | "bored" | "challenge" | "criminology";
    const sessionId = body.sessionId as string;
    const eventType = body.eventType as "session_start" | "session_heartbeat" | "session_end";
    const clientTs = body.clientTs as string | undefined;

    if (!userId || !mode || !sessionId || !eventType) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const result = await enforceAndAccrueMinutes({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      userId,
      mode,
      sessionId,
      eventType,
      clientTs,
      maxAccrualPerEventMinutes: 5, // keeps it honest
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 403 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



export type SafetyResult =
  | { ok: true }
  | { ok: false; severity: "low" | "medium" | "high"; category: string; message: string };

export function basicSafetyGuard(userText: string): SafetyResult {
  const t = userText.toLowerCase();

  // Minimal examples — expand later with your real safety engine
  if (t.includes("i want to kill myself") || t.includes("suicide")) {
    return {
      ok: false,
      severity: "high",
      category: "self_harm",
      message:
        "I can’t help with self-harm. If you’re in immediate danger, call local emergency services. If you want, tell me your country and I can help find a crisis line.",
    };
  }

  return { ok: true };
}


export type MemoryTier = "pinned" | "normal" | "sensitive";
export type MemoryAction = "STORE" | "ASK" | "IGNORE";

export type MemoryCategory =
  | "identity_preference" // name preference, what to be called
  | "relationships" // spouse, kids, key people
  | "life_context" // moving, work, projects (non-sensitive)
  | "preferences" // UI, tone, humor, style
  | "goals_plans" // app goals, roadmap
  | "boundaries" // do/don't, consent rules
  | "safety_relevant" // self-harm risk indicators, crisis preferences
  | "trauma_context" // high-level trauma events (requires ASK unless user explicit)
  | "health" // medical info (ASK unless user explicit + needed)
  | "legal_case" // legal facts / timelines (often STORE, sometimes ASK)
  | "financial" // ASK usually
  | "other";

export type MemoryCandidate = {
  category: MemoryCategory;
  tier: MemoryTier;
  text: string; // candidate memory text (must be factual, minimal)
  confidence: number; // 0..1
  reasons: string[]; // for logs / debugging
  requiresConsent: boolean; // true => ASK unless already consented
};

export type MemoryDecision = {
  action: MemoryAction;
  candidates: MemoryCandidate[];
  note?: string; // user-facing explanation prompt (for ASK)
};



import type { MemoryCategory, MemoryTier } from "./types";

export const SENSITIVE_CATEGORIES: MemoryCategory[] = [
  "trauma_context",
  "health",
  "financial",
  "safety_relevant",
];

export const ALWAYS_ALLOWED_CATEGORIES: MemoryCategory[] = [
  "identity_preference",
  "preferences",
  "boundaries",
  "goals_plans",
  "life_context",
  "relationships",
  "legal_case",
];

export function isSensitive(category: MemoryCategory, tier: MemoryTier) {
  return tier === "sensitive" || SENSITIVE_CATEGORIES.includes(category);
}

/**
 * Hard blocks: things we should never store as durable memory unless user explicitly asks
 * AND it's necessary for function. Even then, usually store in "sensitive" + user-controlled.
 */
export const HARD_BLOCK_PATTERNS: RegExp[] = [
  /\b(ssn|social security)\b/i,
  /\bcredit card\b|\bcard number\b/i,
  /\bpassword\b|\bpasscode\b|\b2fa\b/i,
  /\bbank account\b|\brouting number\b/i,
  /\bprivate key\b|\bseed phrase\b/i,
];

/**
 * “Never invent details” guardrail helper:
 * reject candidate if it contains unsupported specifics (dates/places/names) not in source text.
 * This is heuristic; we also do a second pass with citations in backend.
 */
export function hasUnsupportedSpecifics(candidateText: string, sourceText: string) {
  // If candidate introduces a date-like token not present in source, flag it
  const dateLike = candidateText.match(/\b(20\d{2}|19\d{2})\b/g) ?? [];
  for (const d of dateLike) {
    if (!sourceText.includes(d)) return true;
  }
  return false;
}



import type { MemoryCandidate, MemoryDecision, MemoryCategory, MemoryTier } from "@firefly/shared/memory/types";
import { HARD_BLOCK_PATTERNS, hasUnsupportedSpecifics, isSensitive } from "@firefly/shared/memory/rules";

type ClassifyInput = {
  userText: string;
  // recentMessages is optional; use it if you want better extraction later
  recentMessages?: { role: "user" | "assistant"; content: string }[];
  userPrefs?: {
    allowSensitiveMemory?: boolean; // user toggle in settings
    defaultConsentMode?: "ask" | "auto"; // recommended: ask
  };
  knownEntities?: {
    // optional: if you already have verified relationship names etc.
    spouseName?: string;
    childNames?: string[];
  };
};

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function anyMatch(patterns: RegExp[], text: string) {
  return patterns.some((p) => p.test(text));
}

function includesAny(text: string, phrases: string[]) {
  const t = text.toLowerCase();
  return phrases.some((p) => t.includes(p));
}

/**
 * Very conservative extraction:
 * - Only produce memories that are explicitly stated
 * - Prefer user preference + boundaries + stable context
 * - Trauma/health/financial => ASK (unless user explicitly says “remember this”)
 */
export function classifyMemory(input: ClassifyInput): MemoryDecision {
  const raw = input.userText ?? "";
  const text = norm(raw);
  const lower = text.toLowerCase();

  // Hard block: never store secrets / credentials
  if (anyMatch(HARD_BLOCK_PATTERNS, text)) {
    return {
      action: "IGNORE",
      candidates: [],
      note: "Contains sensitive credentials; not storing.",
    };
  }

  const explicitRemember =
    includesAny(lower, ["remember this", "remember that", "save this", "store this", "add to memory", "don’t forget"]) &&
    !includesAny(lower, ["don't remember", "do not remember", "forget"]);

  const explicitForget = includesAny(lower, ["forget this", "delete this", "remove this from memory"]);

  // If user requests forget, your memory subsystem should route to deletion flow, not classifier
  if (explicitForget) {
    return {
      action: "ASK",
      candidates: [],
      note: "It sounds like you want me to forget something. Tell me exactly what text or memory to remove.",
    };
  }

  const candidates: MemoryCandidate[] = [];

  // ---- Preference: what to call user
  if (includesAny(lower, ["call me ", "refer to me as ", "i prefer to be called", "please call me"])) {
    const m = text.match(/(?:call me|refer to me as|prefer to be called)\s+(.+?)(?:\.|,|$)/i);
    if (m?.[1]) {
      candidates.push({
        category: "identity_preference",
        tier: "pinned",
        text: `Preferred name/nickname: ${norm(m[1]).replace(/^["']|["']$/g, "")}`,
        confidence: 0.85,
        reasons: ["explicit naming preference"],
        requiresConsent: false,
      });
    }
  }

  // ---- Preferences: tone / humor / UI likes
  if (includesAny(lower, ["i like", "i prefer", "i hate", "don’t", "do not", "please avoid", "i want"]) &&
      includesAny(lower, ["tone", "humor", "jokes", "layout", "dark", "charcoal", "fuchsia", "buttons", "tabs"])) {
    candidates.push({
      category: "preferences",
      tier: "normal",
      text: `Preference noted: ${text}`,
      confidence: 0.55,
      reasons: ["preference language + UI/tone keywords"],
      requiresConsent: false,
    });
  }

  // ---- Boundaries (consent / no pronouns / privacy)
  if (includesAny(lower, ["no pronouns", "don’t ask my gender", "privacy", "consent", "don’t store", "do not store"])) {
    candidates.push({
      category: "boundaries",
      tier: "pinned",
      text: `Boundary: ${text}`,
      confidence: 0.7,
      reasons: ["explicit boundary/privacy instruction"],
      requiresConsent: false,
    });
  }

  // ---- Legal-case facts (high-level, no extra details)
  if (includesAny(lower, ["school", "district", "ferpa", "becca", "truancy", "parenting plan", "enrolled", "unenrolled"])) {
    // Keep it minimal — don't store whole rant, store stable fact
    candidates.push({
      category: "legal_case",
      tier: "normal",
      text: `Legal/education context mentioned: ${text}`,
      confidence: 0.45,
      reasons: ["legal/school keywords"],
      requiresConsent: false,
    });
  }

  // ---- Trauma/health indicators
  const traumaish = includesAny(lower, ["assault", "abuse", "rape", "molest", "trauma", "ptsd", "cptsd"]);
  const healthish = includesAny(lower, ["diagnosed", "medication", "antibiotic", "uti", "pain", "therapy"]);
  const financialish = includesAny(lower, ["bank", "credit", "debt", "loan", "ssn", "rent", "income"]);

  if (traumaish || healthish || financialish) {
    // Only store with consent, and only high-level (no details)
    const category: MemoryCategory = traumaish ? "trauma_context" : healthish ? "health" : "financial";
    const tier: MemoryTier = "sensitive";

    // If user explicitly asked to remember, allow STORE but keep minimal & verified
    const requiresConsent = !explicitRemember;

    candidates.push({
      category,
      tier,
      text: `Sensitive context referenced (high-level): ${text}`,
      confidence: 0.35,
      reasons: ["sensitive topic keywords", requiresConsent ? "needs consent" : "explicit remember request"],
      requiresConsent,
    });
  }

  // ---- Never invent details check (best-effort heuristic)
  const verified: MemoryCandidate[] = [];
  for (const c of candidates) {
    if (hasUnsupportedSpecifics(c.text, text)) {
      // downgrade: better to ask than store something with invented specifics
      verified.push({
        ...c,
        confidence: Math.min(c.confidence, 0.25),
        requiresConsent: true,
        reasons: [...c.reasons, "unsupported specifics detected -> force consent"],
      });
    } else {
      verified.push(c);
    }
  }

  if (!verified.length) {
    return { action: "IGNORE", candidates: [] };
  }

  // If any sensitive candidate requires consent, ASK (unless user settings allow auto)
  const wantsAuto = input.userPrefs?.defaultConsentMode === "auto";
  const allowSensitive = input.userPrefs?.allowSensitiveMemory === true;

  const hasSensitiveNeedsConsent = verified.some((c) => isSensitive(c.category, c.tier) && c.requiresConsent);
  const hasSensitive = verified.some((c) => isSensitive(c.category, c.tier));

  if (hasSensitiveNeedsConsent && !wantsAuto) {
    return {
      action: "ASK",
      candidates: verified,
      note:
        "I can remember the high-level context you just shared, but it’s sensitive. Do you want me to store it so it helps in future chats, or keep it private?",
    };
  }

  if (hasSensitive && !allowSensitive) {
    return {
      action: "ASK",
      candidates: verified,
      note:
        "This touches sensitive info. Your settings currently keep sensitive memory OFF. Want to temporarily allow it, or keep it out of memory?",
    };
  }

  // Otherwise store only candidates above a confidence floor
  const store = verified.filter((c) => c.confidence >= 0.45 || explicitRemember);

  if (!store.length) {
    return {
      action: "ASK",
      candidates: verified,
      note:
        "This might be important, but I’m not confident enough to store it automatically. Should I remember a high-level note about it?",
    };
  }

  return { action: "STORE", candidates: store };
}



import { NextRequest, NextResponse } from "next/server";
import { classifyMemory } from "@/lib/memory/classifier";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userText = String(body.userText ?? "");
    const userPrefs = body.userPrefs ?? { defaultConsentMode: "ask", allowSensitiveMemory: false };

    if (!userText.trim()) {
      return NextResponse.json({ ok: true, decision: { action: "IGNORE", candidates: [] } });
    }

    const decision = classifyMemory({
      userText,
      userPrefs,
      recentMessages: body.recentMessages ?? [],
    });

    return NextResponse.json({ ok: true, decision });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



// decision.action === "ASK"
{
  note: "I can remember the high-level context... store it or keep it private?",
  candidates: [
    { category: "trauma_context", tier: "sensitive", text: "...", requiresConsent: true, ... }
  ]
}


alter table public.memory_items
  add column if not exists tier text,
  add column if not exists category text,
  add column if not exists confidence numeric,
  add column if not exists source text,
  add column if not exists consent_required boolean default false,
  add column if not exists consent_granted boolean default false,
  add column if not exists dedupe_key text,
  add column if not exists updated_at timestamptz default now();

create unique index if not exists memory_items_user_dedupe_unique
  on public.memory_items(user_id, dedupe_key)
  where dedupe_key is not null;



import crypto from "crypto";
import type { MemoryCandidate } from "@firefly/shared/memory/types";
import { createClient } from "@supabase/supabase-js";

function stableDedupeKey(userId: string, category: string, text: string) {
  const base = `${userId}::${category}::${text.trim().toLowerCase()}`;
  return crypto.createHash("sha256").update(base).digest("hex");
}

export async function upsertMemories(args: {
  supabaseUrl: string;
  supabaseServiceKey: string;
  userId: string;
  conversationId?: string;
  candidates: MemoryCandidate[];
  // consent
  consentGranted: boolean; // result of ASK UI or settings toggle
  source?: string; // "chat" | "challenge" | "bored" etc.
}) {
  const sb = createClient(args.supabaseUrl, args.supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const rows = args.candidates.map((c) => {
    const dedupeKey = stableDedupeKey(args.userId, c.category, c.text);
    return {
      user_id: args.userId,
      conversation_id: args.conversationId ?? null,
      tier: c.tier,
      category: c.category,
      content: c.text, // if your column is named differently, change here
      confidence: c.confidence,
      source: args.source ?? "chat",
      consent_required: c.requiresConsent,
      consent_granted: c.requiresConsent ? args.consentGranted : true,
      dedupe_key: dedupeKey,
      updated_at: new Date().toISOString(),
    };
  });

  // Upsert by (user_id, dedupe_key). If your unique index differs, adjust onConflict.
  const { data, error } = await sb
    .from("memory_items")
    .upsert(rows, { onConflict: "user_id,dedupe_key" })
    .select("*");

  if (error) throw new Error(`memory_upsert_failed: ${error.message}`);
  return data;
}



import { NextRequest, NextResponse } from "next/server";
import { upsertMemories } from "@/lib/memory/write";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = String(body.userId ?? "");
    const candidates = body.candidates ?? [];
    const consentGranted = Boolean(body.consentGranted);
    const conversationId = body.conversationId ? String(body.conversationId) : undefined;
    const source = body.source ? String(body.source) : "chat";

    if (!userId || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    // If user declined, we simply do nothing (or you can log a preference)
    if (!consentGranted) {
      return NextResponse.json({ ok: true, stored: 0 });
    }

    const stored = await upsertMemories({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      userId,
      conversationId,
      candidates,
      consentGranted: true,
      source,
    });

    return NextResponse.json({ ok: true, stored: stored.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}




create table if not exists public.user_settings (
  user_id uuid primary key,
  memory_enabled boolean not null default true,
  sensitive_memory_enabled boolean not null default false,
  consent_mode text not null default 'ask' check (consent_mode in ('ask','auto')),
  remember_chip_enabled boolean not null default true,
  export_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "settings_select_own" on public.user_settings
for select using (auth.uid() = user_id);

create policy "settings_upsert_own" on public.user_settings
for insert with check (auth.uid() = user_id);

create policy "settings_update_own" on public.user_settings
for update using (auth.uid() = user_id);

create or replace function public.ensure_user_settings(p_user_id uuid)
returns void as $$
begin
  insert into public.user_settings(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$ language plpgsql;




import { createClient } from "@supabase/supabase-js";

export async function loadUserSettings(args: {
  supabaseUrl: string;
  serviceKey: string;
  userId: string;
}) {
  const sb = createClient(args.supabaseUrl, args.serviceKey, { auth: { persistSession: false } });

  await sb.rpc("ensure_user_settings", { p_user_id: args.userId });

  const { data, error } = await sb
    .from("user_settings")
    .select("*")
    .eq("user_id", args.userId)
    .single();

  if (error || !data) throw new Error(`settings_load_failed: ${error?.message}`);
  return data;
}


import { NextRequest, NextResponse } from "next/server";
import { classifyMemory } from "@/lib/memory/classifier";
import { loadUserSettings } from "@/lib/settings/load";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body.userId ?? "");
    const userText = String(body.userText ?? "");

    if (!userId || !userText.trim()) {
      return NextResponse.json({ ok: true, decision: { action: "IGNORE", candidates: [] } });
    }

    const settings = await loadUserSettings({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      userId,
    });

    if (!settings.memory_enabled) {
      return NextResponse.json({
        ok: true,
        decision: { action: "IGNORE", candidates: [], note: "Memory is disabled in settings." },
        settings,
      });
    }

    const decision = classifyMemory({
      userText,
      recentMessages: body.recentMessages ?? [],
      userPrefs: {
        allowSensitiveMemory: settings.sensitive_memory_enabled,
        defaultConsentMode: settings.consent_mode,
      },
    });

    return NextResponse.json({ ok: true, decision, settings });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { upsertMemories } from "@/lib/memory/write";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = String(body.userId ?? "");
    const text = String(body.text ?? "").trim();
    const category = String(body.category ?? "preferences");
    const tier = String(body.tier ?? "normal");
    const conversationId = body.conversationId ? String(body.conversationId) : undefined;
    const source = body.source ? String(body.source) : "chat";

    if (!userId || !text) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const stored = await upsertMemories({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      userId,
      conversationId,
      consentGranted: true, // explicit tap = explicit consent
      source,
      candidates: [
        {
          category: category as any,
          tier: tier as any,
          text,
          confidence: 0.9,
          reasons: ["explicit_user_remember_chip"],
          requiresConsent: false,
        },
      ],
    });

    return NextResponse.json({ ok: true, stored: stored.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}




import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get("userId") ?? "");
    const tier = searchParams.get("tier"); // optional
    const category = searchParams.get("category"); // optional
    const limit = Math.min(200, Number(searchParams.get("limit") ?? 50));

    if (!userId) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    let q = sb.from("memory_items").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(limit);

    if (tier) q = q.eq("tier", tier);
    if (category) q = q.eq("category", category);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body.userId ?? "");
    const id = body.id; // memory_items.id

    if (!userId || !id) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const { error } = await sb.from("memory_items").delete().eq("user_id", userId).eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body.userId ?? "");
    const id = body.id;
    const pinned = Boolean(body.pinned);

    if (!userId || !id) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const tier = pinned ? "pinned" : "normal";

    const { data, error } = await sb
      .from("memory_items")
      .update({ tier, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



-- 1) Explicit user feedback signals (best + least creepy)
create table if not exists public.style_signals (
  id bigserial primary key,
  user_id uuid not null,
  conversation_id uuid,
  mode text not null check (mode in ('chat','bored','challenge','criminology')),
  signal_type text not null check (
    signal_type in (
      'tone_prefer_gentle',
      'tone_prefer_direct',
      'humor_more',
      'humor_less',
      'depth_more',
      'depth_less',
      'pace_slower',
      'pace_faster',
      'questions_more',
      'questions_less'
    )
  ),
  weight int not null default 1 check (weight >= 1 and weight <= 5),
  client_ts timestamptz,
  server_ts timestamptz not null default now()
);

create index if not exists idx_style_signals_user_time
  on public.style_signals(user_id, server_ts desc);

alter table public.style_signals enable row level security;

create policy "style_signals_insert_own" on public.style_signals
for insert with check (auth.uid() = user_id);

create policy "style_signals_select_own" on public.style_signals
for select using (auth.uid() = user_id);


-- 2) Weekly aggregated summary (NO raw text)
create table if not exists public.weekly_molding_summary (
  user_id uuid not null,
  week_start date not null,
  week_end date not null,

  total_minutes_chat int not null default 0,
  total_minutes_challenge int not null default 0,
  total_minutes_bored int not null default 0,

  -- scores are -100..+100 where positive means "more of that"
  tone_directness_score int not null default 0, -- + = direct, - = gentle
  humor_score int not null default 0, -- + = more humor
  depth_score int not null default 0, -- + = deeper
  pace_score int not null default 0, -- + = faster (negative = slower)
  questions_score int not null default 0, -- + = more questions

  -- confidence 0..1 based on number of signals
  confidence numeric not null default 0,

  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.weekly_molding_summary enable row level security;

create policy "weekly_summary_select_own" on public.weekly_molding_summary
for select using (auth.uid() = user_id);



export type Mode = "chat" | "bored" | "challenge" | "criminology";

export type StyleSignalType =
  | "tone_prefer_gentle"
  | "tone_prefer_direct"
  | "humor_more"
  | "humor_less"
  | "depth_more"
  | "depth_less"
  | "pace_slower"
  | "pace_faster"
  | "questions_more"
  | "questions_less";

export type WeeklyMoldingSummary = {
  user_id: string;
  week_start: string; // YYYY-MM-DD
  week_end: string;

  total_minutes_chat: number;
  total_minutes_challenge: number;
  total_minutes_bored: number;

  tone_directness_score: number;
  humor_score: number;
  depth_score: number;
  pace_score: number;
  questions_score: number;

  confidence: number;
};


import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = String(body.userId ?? "");
    const conversationId = body.conversationId ? String(body.conversationId) : null;
    const mode = String(body.mode ?? "chat");
    const signalType = String(body.signalType ?? "");
    const weight = Math.max(1, Math.min(5, Number(body.weight ?? 1)));
    const clientTs = body.clientTs ? String(body.clientTs) : null;

    if (!userId || !signalType) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await sb.from("style_signals").insert({
      user_id: userId,
      conversation_id: conversationId,
      mode,
      signal_type: signalType,
      weight,
      client_ts: clientTs,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



import { createClient } from "@supabase/supabase-js";

function scoreForSignal(signalType: string, weight: number) {
  const w = Math.max(1, Math.min(5, weight));

  switch (signalType) {
    case "tone_prefer_direct": return { tone: +10 * w };
    case "tone_prefer_gentle": return { tone: -10 * w };

    case "humor_more": return { humor: +10 * w };
    case "humor_less": return { humor: -10 * w };

    case "depth_more": return { depth: +10 * w };
    case "depth_less": return { depth: -10 * w };

    case "pace_faster": return { pace: +10 * w };
    case "pace_slower": return { pace: -10 * w };

    case "questions_more": return { questions: +10 * w };
    case "questions_less": return { questions: -10 * w };

    default: return {};
  }
}

function clampScore(n: number) {
  return Math.max(-100, Math.min(100, Math.round(n)));
}

export async function generateWeeklyMoldingSummary(args: {
  supabaseUrl: string;
  serviceKey: string;
  userId: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
}) {
  const sb = createClient(args.supabaseUrl, args.serviceKey, { auth: { persistSession: false } });

  // 1) minutes: use user_progress (simple) OR derive from activity_events (more accurate)
  const { data: progress } = await sb
    .from("user_progress")
    .select("chat_minutes,challenge_minutes,bored_minutes")
    .eq("user_id", args.userId)
    .single();

  const totalChat = progress?.chat_minutes ?? 0;
  const totalChallenge = progress?.challenge_minutes ?? 0;
  const totalBored = progress?.bored_minutes ?? 0;

  // 2) get style signals in range
  const { data: signals, error: sigErr } = await sb
    .from("style_signals")
    .select("signal_type,weight,server_ts")
    .eq("user_id", args.userId)
    .gte("server_ts", `${args.weekStart}T00:00:00.000Z`)
    .lte("server_ts", `${args.weekEnd}T23:59:59.999Z`);

  if (sigErr) throw new Error(`signals_load_failed: ${sigErr.message}`);

  let tone = 0, humor = 0, depth = 0, pace = 0, questions = 0;

  for (const s of signals ?? []) {
    const add = scoreForSignal(s.signal_type, s.weight ?? 1);
    tone += (add as any).tone ?? 0;
    humor += (add as any).humor ?? 0;
    depth += (add as any).depth ?? 0;
    pace += (add as any).pace ?? 0;
    questions += (add as any).questions ?? 0;
  }

  // confidence based on number of explicit signals (not ML)
  const count = (signals ?? []).length;
  const confidence = Math.max(0, Math.min(1, count / 10)); // 10+ signals ~ 1.0

  const row = {
    user_id: args.userId,
    week_start: args.weekStart,
    week_end: args.weekEnd,

    total_minutes_chat: totalChat,
    total_minutes_challenge: totalChallenge,
    total_minutes_bored: totalBored,

    tone_directness_score: clampScore(tone),
    humor_score: clampScore(humor),
    depth_score: clampScore(depth),
    pace_score: clampScore(pace),
    questions_score: clampScore(questions),

    confidence,
  };

  const { error: upErr } = await sb
    .from("weekly_molding_summary")
    .upsert(row, { onConflict: "user_id,week_start" });

  if (upErr) throw new Error(`weekly_summary_upsert_failed: ${upErr.message}`);

  return row;
}





import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyMoldingSummary } from "@/lib/molding/weekly";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body.userId ?? "");
    const weekStart = String(body.weekStart ?? "");
    const weekEnd = String(body.weekEnd ?? "");

    if (!userId || !weekStart || !weekEnd) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const row = await generateWeeklyMoldingSummary({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      userId,
      weekStart,
      weekEnd,
    });

    return NextResponse.json({ ok: true, summary: row });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get("userId") ?? "");
    if (!userId) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await sb
      .from("weekly_molding_summary")
      .select("*")
      .eq("user_id", userId)
      .order("week_start", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, summary: data?.[0] ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



export type StylePreset = {
  directness: "gentle" | "balanced" | "direct";
  humor: "low" | "balanced" | "high";
  depth: "light" | "balanced" | "deep";
  pacing: "slow" | "balanced" | "fast";
  questions: "few" | "balanced" | "more";
  confidence: number; // 0..1
};

/**
 * Scores are -100..+100. confidence 0..1.
 * Positive means "more" of that axis (except tone: + = direct).
 */
export function presetFromWeekly(scores: {
  tone_directness_score: number;
  humor_score: number;
  depth_score: number;
  pace_score: number;
  questions_score: number;
  confidence: number;
}): StylePreset {
  const c = Math.max(0, Math.min(1, scores.confidence ?? 0));

  function band(n: number) {
    if (n >= 25) return "high";
    if (n <= -25) return "low";
    return "balanced";
  }

  function band3(n: number, neg: string, mid: string, pos: string) {
    if (n >= 25) return pos;
    if (n <= -25) return neg;
    return mid;
  }

  return {
    directness: band3(scores.tone_directness_score, "gentle", "balanced", "direct") as any,
    humor: band(scores.humor_score) as any,
    depth: band3(scores.depth_score, "light", "balanced", "deep") as any,
    pacing: band3(scores.pace_score, "slow", "balanced", "fast") as any,
    questions: band3(scores.questions_score, "few", "balanced", "more") as any,
    confidence: c,
  };
}



import type { StylePreset } from "@firefly/shared/molding/preset";

function line(label: string, value: string) {
  return `- ${label}: ${value}`;
}

export function buildStyleDirective(preset: StylePreset | null): string {
  if (!preset) return "";

  // If confidence is low, keep it subtle
  const subtle = preset.confidence < 0.35;

  const header = "STYLE DIRECTIVE (user preference, non-sensitive):";
  const notes = subtle
    ? "Apply gently. If user feedback conflicts, follow the user in the moment."
    : "Apply consistently. If user feedback conflicts, follow the user in the moment.";

  const content = [
    header,
    notes,
    line("Directness", preset.directness),
    line("Humor", preset.humor),
    line("Depth", preset.depth),
    line("Pacing", preset.pacing),
    line("Questions", preset.questions),
    line("Confidence", String(preset.confidence.toFixed(2))),
  ].join("\n");

  return `\n\n${content}\n`;
}


import { createClient } from "@supabase/supabase-js";
import { presetFromWeekly, type StylePreset } from "@firefly/shared/molding/preset";

export async function loadStylePreset(args: {
  supabaseUrl: string;
  serviceKey: string;
  userId: string;
}): Promise<StylePreset | null> {
  const sb = createClient(args.supabaseUrl, args.serviceKey, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from("weekly_molding_summary")
    .select(
      "tone_directness_score,humor_score,depth_score,pace_score,questions_score,confidence,week_start,week_end"
    )
    .eq("user_id", args.userId)
    .order("week_start", { ascending: false })
    .limit(1);

  if (error) throw new Error(`weekly_summary_load_failed: ${error.message}`);

  const row = data?.[0];
  if (!row) return null;

  return presetFromWeekly({
    tone_directness_score: row.tone_directness_score ?? 0,
    humor_score: row.humor_score ?? 0,
    depth_score: row.depth_score ?? 0,
    pace_score: row.pace_score ?? 0,
    questions_score: row.questions_score ?? 0,
    confidence: Number(row.confidence ?? 0),
  });
}



import { loadStylePreset } from "@/lib/molding/loadPreset";
import { buildStyleDirective } from "@/lib/molding/inject";
import { loadUserSettings } from "@/lib/settings/load";



const settings = await loadUserSettings({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  userId,
});

// Optional: allow user to disable molding
// (If you don’t have this setting yet, you can skip it)
const moldingEnabled = true; // or settings.molding_enabled if you add it

let styleDirective = "";
if (moldingEnabled) {
  const preset = await loadStylePreset({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    userId,
  });
  styleDirective = buildStyleDirective(preset);
}

// Wherever you build your system prompt:
const systemPrompt =
  BASE_SYSTEM_PROMPT +
  styleDirective +
  "\n\nIMPORTANT: Never claim to remember details you do not have. If unsure, ask.";





alter table public.user_settings
  add column if not exists molding_enabled boolean not null default true;



const moldingEnabled = settings.molding_enabled !== false;



create table if not exists public.conversation_settings (
  conversation_id uuid primary key,
  user_id uuid not null,
  -- nullable means "no override"
  directness text check (directness in ('gentle','balanced','direct')),
  humor text check (humor in ('low','balanced','high')),
  depth text check (depth in ('light','balanced','deep')),
  pacing text check (pacing in ('slow','balanced','fast')),
  questions text check (questions in ('few','balanced','more')),
  expires_at timestamptz, -- optional TTL
  updated_at timestamptz not null default now()
);

create index if not exists idx_conversation_settings_user
  on public.conversation_settings(user_id);

alter table public.conversation_settings enable row level security;

create policy "conv_settings_select_own" on public.conversation_settings
for select using (auth.uid() = user_id);

create policy "conv_settings_upsert_own" on public.conversation_settings
for insert with check (auth.uid() = user_id);

create policy "conv_settings_update_own" on public.conversation_settings
for update using (auth.uid() = user_id);


import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED = {
  directness: ["gentle", "balanced", "direct"],
  humor: ["low", "balanced", "high"],
  depth: ["light", "balanced", "deep"],
  pacing: ["slow", "balanced", "fast"],
  questions: ["few", "balanced", "more"],
} as const;

function valid(key: keyof typeof ALLOWED, value: any) {
  return value == null || (typeof value === "string" && (ALLOWED[key] as readonly string[]).includes(value));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = String(body.userId ?? "");
    const conversationId = String(body.conversationId ?? "");
    const overrides = body.overrides ?? {};
    const expiresInMinutes = Number(body.expiresInMinutes ?? 240); // default 4 hours

    if (!userId || !conversationId) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    // Validate
    for (const k of Object.keys(ALLOWED) as (keyof typeof ALLOWED)[]) {
      if (!valid(k, overrides[k])) {
        return NextResponse.json({ ok: false, error: "INVALID_OVERRIDE", field: k }, { status: 400 });
      }
    }

    const expiresAt = new Date(Date.now() + Math.max(5, expiresInMinutes) * 60_000).toISOString();

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const row = {
      conversation_id: conversationId,
      user_id: userId,
      directness: overrides.directness ?? null,
      humor: overrides.humor ?? null,
      depth: overrides.depth ?? null,
      pacing: overrides.pacing ?? null,
      questions: overrides.questions ?? null,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from("conversation_settings")
      .upsert(row, { onConflict: "conversation_id" })
      .select("*")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, settings: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get("userId") ?? "");
    const conversationId = String(searchParams.get("conversationId") ?? "");

    if (!userId || !conversationId) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await sb
      .from("conversation_settings")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .single();

    if (error) {
      // No row is fine: means no overrides set
      return NextResponse.json({ ok: true, settings: null });
    }

    // TTL check
    if (data?.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ ok: true, settings: null });
    }

    return NextResponse.json({ ok: true, settings: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



import type { StylePreset } from "@firefly/shared/molding/preset";

export type ConversationOverride = Partial<Omit<StylePreset, "confidence">> & {
  expires_at?: string | null;
};

export function mergePreset(weekly: StylePreset | null, override: ConversationOverride | null): StylePreset | null {
  if (!weekly && !override) return null;

  const base: StylePreset = weekly ?? {
    directness: "balanced",
    humor: "balanced",
    depth: "balanced",
    pacing: "balanced",
    questions: "balanced",
    confidence: 0,
  };

  if (!override) return base;

  return {
    ...base,
    directness: (override.directness as any) ?? base.directness,
    humor: (override.humor as any) ?? base.humor,
    depth: (override.depth as any) ?? base.depth,
    pacing: (override.pacing as any) ?? base.pacing,
    questions: (override.questions as any) ?? base.questions,
    // confidence stays weekly (override is explicit, doesn’t need confidence)
    confidence: base.confidence,
  };



import type { StylePreset } from "@firefly/shared/molding/preset";

export type ConversationOverride = Partial<Omit<StylePreset, "confidence">> & {
  expires_at?: string | null;
};

export function mergePreset(weekly: StylePreset | null, override: ConversationOverride | null): StylePreset | null {
  if (!weekly && !override) return null;

  const base: StylePreset = weekly ?? {
    directness: "balanced",
    humor: "balanced",
    depth: "balanced",
    pacing: "balanced",
    questions: "balanced",
    confidence: 0,
  };

  if (!override) return base;

  return {
    ...base,
    directness: (override.directness as any) ?? base.directness,
    humor: (override.humor as any) ?? base.humor,
    depth: (override.depth as any) ?? base.depth,
    pacing: (override.pacing as any) ?? base.pacing,
    questions: (override.questions as any) ?? base.questions,
    // confidence stays weekly (override is explicit, doesn’t need confidence)
    confidence: base.confidence,
  };
}



import { mergePreset } from "@/lib/molding/merge";
import { createClient } from "@supabase/supabase-js";

// ... inside handler
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

let overrideRow: any = null;
if (conversationId) {
  const { data } = await sb
    .from("conversation_settings")
    .select("directness,humor,depth,pacing,questions,expires_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    overrideRow = null;
  } else {
    overrideRow = data ?? null;
  }
}

const weeklyPreset = await loadStylePreset({ supabaseUrl, serviceKey, userId });
const merged = mergePreset(weeklyPreset, overrideRow);

const styleDirective = buildStyleDirective(merged);
const systemPrompt = BASE_SYSTEM_PROMPT + styleDirective + "\n\nIMPORTANT: Follow the user's corrections instantly.";



{ "userId": "...", "mode": "chat", "sessionId": "...uuid...", "eventType": "session_start", "clientTs": "..." }



{ "userId":"...", "userText":"...", "recentMessages":[...], "conversationId":"..." }



{ "userId":"...", "conversationId":"...", "mode":"chat", "message":"...", "recentMessages":[...] }



{ "userId":"...", "conversationId":"...", "candidates":[...], "consentGranted": true, "source":"chat" }


{ "userId":"...", "conversationId":"...", "text":"...", "category":"preferences", "tier":"normal", "source":"chat" }


{ "userId":"...", "conversationId":"...", "overrides": { "directness":"direct" }, "expiresInMinutes":240 }


{ "userId":"...", "conversationId":"...", "mode":"chat", "signalType":"tone_prefer_direct", "weight":2 }



{ "userId":"...", "windowDays":30, "conversationIds":[...] }




export type TruthAssessment =
  | "agree"
  | "disagree"
  | "uncertain";

export function truthDisciplineRules(): string {
  return `
TRUTH DISCIPLINE (non-negotiable):
- Do NOT agree unless the user’s claim is factually or logically supported.
- Do NOT validate incorrect conclusions.
- Validation of feelings is allowed; validation of claims requires evidence.
- If the claim is uncertain or incomplete, say so plainly.
- If correcting the user, do so respectfully and with explanation.
- Never say “you’re right” unless you mean it.
- Never pretend agreement to soothe emotions.

Language guidance:
- Use “I agree” ONLY when agreement is warranted.
- Otherwise use:
  • “I don’t think that’s accurate, and here’s why…”
  • “I’m not sure that conclusion follows from the facts…”
  • “There’s another way to look at this…”

Goal:
Help the user think clearly, not feel falsely reassured.
`.trim();
}



import { truthDisciplineRules } from "@/lib/truth/discipline";


return `
CHALLENGE MODE (in-depth conversation)
Purpose: Help the user reason clearly, gain perspective, and examine assumptions without shame, diagnosis, or coercion.

${truthDisciplineRules()}

Core rules:
- Do NOT diagnose. Do NOT label the user as a psychopath/narcissist/etc.
- Do NOT claim certainty about hidden motives.
- Agreement must be earned through facts or logic.
- If the user is right, acknowledge it clearly.
- If the user is wrong, explain why without shaming.
- Never invent memory details. If unsure, ask.

Method:
1) Mirror: Summarize the situation in 2–4 bullets (facts + feelings).
2) Clarify: Ask 1–3 focused questions ONLY if needed.
3) Reframe: Offer 2–3 plausible interpretations.
4) Options: Provide 2–4 next actions with tradeoffs.
5) Ground: One small stabilizing step if depleted.

Style:
- Calm, steady, direct.
- No platitudes.
- No false reassurance.
`.trim();



export function avoidFalseAgreement(): string {
  return `
LANGUAGE CHECK:
Avoid reflexive agreement phrases unless warranted:
- Avoid: “You’re absolutely right” (unless provably true)
- Prefer: “I see why you’d think that”
- Prefer: “That makes sense emotionally, but the facts suggest…”
- Prefer: “Let’s separate what feels true from what we can verify”
`.trim();
}





create table if not exists public.criminology_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now(),

  window_days int not null default 30,
  conversation_ids uuid[],

  -- Report is JSON so you can render in Flutter cleanly
  report jsonb not null,

  -- for quick filtering / UI
  confidence numeric not null default 0,
  disclaimer_version text not null default 'v1'
);

create index if not exists idx_criminology_reports_user_time
  on public.criminology_reports(user_id, created_at desc);

alter table public.criminology_reports enable row level security;

create policy "criminology_reports_select_own" on public.criminology_reports
for select using (auth.uid() = user_id);

create policy "criminology_reports_insert_own" on public.criminology_reports
for insert with check (auth.uid() = user_id);



export type CriminologyReportV1 = {
  meta: {
    version: "v1";
    generatedAt: string; // ISO
    windowDays: number;
    sources: {
      conversationCount: number;
      messageCount: number;
      chatMinutes?: number;
      challengeMinutes?: number;
    };
    confidence: number; // 0..1
  };

  disclaimers: string[];

  // This is the “you’re not broken” core—without false agreement.
  overview: {
    whatThisIs: string;
    whatThisIsNot: string;
  };

  comparative: {
    chatPatternSummary: string;
    challengePatternSummary: string;
    notableShifts: string[]; // tone, directness, rumination vs clarity, etc.
  };

  cognitiveStyle: {
    strengths: string[];
    riskPatterns: string[]; // NOT “diagnosis”
    distortionWatchlist: string[]; // e.g. catastrophizing, mind-reading
  };

  regulation: {
    triggersLikely: string[]; // “topics/situations that spike load”
    groundingThatHelps: string[]; // safe suggestions
  };

  manipulationConcernModule: {
    // for users fearing they are “evil/psychopath/narcissist”
    realityChecks: string[];
    redFlagsToMonitor: string[]; // behaviors to keep an eye on (non-diagnostic)
    proSocialAnchors: string[]; // empathy indicators, accountability, remorse, etc.
  };

  recommendations: {
    nextSteps: string[]; // specific, non-coercive options
    questionsToAskYourself: string[]; // gentle cross-exam
  };
};


import type { CriminologyReportV1 } from "@firefly/shared/criminology/types";

export function criminologyDisclaimers(): string[] {
  return [
    "This report is not a medical, psychological, or legal diagnosis.",
    "This report is an educational reflection based on patterns in your conversations.",
    "If you are in crisis or considering self-harm, seek immediate local emergency help or a crisis hotline.",
    "If anything feels inaccurate, treat it as a hypothesis and correct it.",
  ];
}

export function buildCriminologySystemPrompt(): string {
  return `
You generate a “Criminology Report” for a self-reflection app.
Hard rules:
- Do NOT diagnose. Do NOT label the user as a psychopath/narcissist/etc.
- Do NOT provide medical advice, legal advice, or certainty about mental health conditions.
- Do NOT flatter or agree for comfort. Agreement must be earned by evidence.
- If evidence is insufficient, say “uncertain” and suggest what data would clarify.
- Never invent personal details. Use ONLY the provided conversation excerpts and stats.

Purpose:
- Compare patterns between normal chat mode and challenge mode.
- Help the user separate feelings from facts and identify reasoning patterns.
- Provide balanced strengths + risks + practical next steps.

Output MUST be valid JSON matching the CriminologyReportV1 schema.
No markdown. No extra keys.
`.trim();
}

export function buildCriminologyUserPrompt(args: {
  windowDays: number;
  stats: {
    conversationCount: number;
    messageCount: number;
    chatMinutes?: number;
    challengeMinutes?: number;
  };
  chatExcerpts: string; // pre-trimmed text
  challengeExcerpts: string; // pre-trimmed text
}): string {
  return `
Generate a CriminologyReportV1.

WindowDays: ${args.windowDays}
Stats: ${JSON.stringify(args.stats)}

CHAT EXCERPTS:
${args.chatExcerpts}

CHALLENGE EXCERPTS:
${args.challengeExcerpts}

Remember:
- Not diagnosis
- No invented facts
- Evidence-based, respectful, clear
- JSON only
`.trim();
}




// Replace this with your existing OpenAI helper if you have one.
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function callLLMJSON(args: {
  system: string;
  user: string;
  model?: string;
}): Promise<any> {
  const model = args.model ?? "gpt-5-mini"; // pick what you use

  const resp = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const content = resp.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    // last-resort: return empty object
    return {};
  }
}



import { createClient } from "@supabase/supabase-js";

function trimToChars(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max) + "\n...[trimmed]";
}

export async function loadModeExcerpts(args: {
  supabaseUrl: string;
  serviceKey: string;
  userId: string;
  windowDays: number;
  conversationIds?: string[];
  // caps
  maxMessagesPerMode?: number;
  maxCharsPerMode?: number;
}) {
  const sb = createClient(args.supabaseUrl, args.serviceKey, { auth: { persistSession: false } });

  const since = new Date(Date.now() - args.windowDays * 24 * 60 * 60 * 1000).toISOString();

  // Assumes you have a messages table with: user_id, role, content, created_at, mode, conversation_id
  // If your schema differs, adjust this select.
  let q = sb
    .from("messages")
    .select("role,content,created_at,mode,conversation_id")
    .eq("user_id", args.userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (args.conversationIds?.length) {
    q = q.in("conversation_id", args.conversationIds);
  }

  const { data, error } = await q.limit(2000); // hard cap
  if (error) throw new Error(`messages_load_failed: ${error.message}`);

  const maxPer = args.maxMessagesPerMode ?? 120;
  const maxChars = args.maxCharsPerMode ?? 12000;

  const chat: string[] = [];
  const challenge: string[] = [];

  for (const m of data ?? []) {
    const line = `[${m.created_at}] ${m.role}: ${m.content}`;
    if (m.mode === "challenge") {
      if (challenge.length < maxPer) challenge.push(line);
    } else if (m.mode === "chat") {
      if (chat.length < maxPer) chat.push(line);
    }
  }

  const chatExcerpts = trimToChars(chat.reverse().join("\n"), maxChars);
  const challengeExcerpts = trimToChars(challenge.reverse().join("\n"), maxChars);

  return {
    chatExcerpts,
    challengeExcerpts,
    stats: {
      conversationCount: new Set((data ?? []).map((m: any) => m.conversation_id)).size,
      messageCount: (data ?? []).length,
    },
  };
}





import type { CriminologyReportV1 } from "@firefly/shared/criminology/types";
import { buildCriminologySystemPrompt, buildCriminologyUserPrompt, criminologyDisclaimers } from "./prompt";
import { loadModeExcerpts } from "./excerpts";
import { callLLMJSON } from "./llm";

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export async function generateCriminologyReport(args: {
  supabaseUrl: string;
  serviceKey: string;
  userId: string;
  windowDays: number;
  conversationIds?: string[];
  minutes?: { chatMinutes?: number; challengeMinutes?: number };
}): Promise<CriminologyReportV1> {
  const { chatExcerpts, challengeExcerpts, stats } = await loadModeExcerpts({
    supabaseUrl: args.supabaseUrl,
    serviceKey: args.serviceKey,
    userId: args.userId,
    windowDays: args.windowDays,
    conversationIds: args.conversationIds,
  });

  // confidence based on amount of evidence, not “vibes”
  const evidenceScore =
    (stats.messageCount >= 120 ? 1 : stats.messageCount / 120) *
    (challengeExcerpts.length > 500 ? 1 : challengeExcerpts.length / 500);
  const confidence = clamp01(0.2 + 0.8 * evidenceScore);

  const userPrompt = buildCriminologyUserPrompt({
    windowDays: args.windowDays,
    stats: {
      ...stats,
      chatMinutes: args.minutes?.chatMinutes,
      challengeMinutes: args.minutes?.challengeMinutes,
    },
    chatExcerpts,
    challengeExcerpts,
  });

  const json = await callLLMJSON({
    system: buildCriminologySystemPrompt(),
    user: userPrompt,
  });

  // Normalize into the expected shape (best-effort)
  const report: CriminologyReportV1 = {
    meta: {
      version: "v1",
      generatedAt: new Date().toISOString(),
      windowDays: args.windowDays,
      sources: {
        ...stats,
        chatMinutes: args.minutes?.chatMinutes,
        challengeMinutes: args.minutes?.challengeMinutes,
      },
      confidence,
    },
    disclaimers: criminologyDisclaimers(),
    overview: json.overview ?? {
      whatThisIs: "A non-diagnostic reflection on patterns in your conversations.",
      whatThisIsNot: "Not a diagnosis or a definitive statement about your character.",
    },
    comparative: json.comparative ?? {
      chatPatternSummary: "Insufficient data to summarize chat patterns confidently.",
      challengePatternSummary: "Insufficient data to summarize challenge patterns confidently.",
      notableShifts: [],
    },
    cognitiveStyle: json.cognitiveStyle ?? { strengths: [], riskPatterns: [], distortionWatchlist: [] },
    regulation: json.regulation ?? { triggersLikely: [], groundingThatHelps: [] },
    manipulationConcernModule: json.manipulationConcernModule ?? {
      realityChecks: [],
      redFlagsToMonitor: [],
      proSocialAnchors: [],
    },
    recommendations: json.recommendations ?? { nextSteps: [], questionsToAskYourself: [] },
  };

  return report;
}



import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateCriminologyReport } from "@/lib/criminology/generate";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = String(body.userId ?? "");
    const windowDays = Math.max(7, Math.min(180, Number(body.windowDays ?? 30)));
    const conversationIds = Array.isArray(body.conversationIds) ? body.conversationIds.map(String) : undefined;

    if (!userId) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Pull minutes for confidence/context (optional)
    const { data: progress } = await sb
      .from("user_progress")
      .select("chat_minutes,challenge_minutes,criminology_unlocked")
      .eq("user_id", userId)
      .single();

    // Enforce unlock here too (belt + suspenders)
    if (!progress?.criminology_unlocked) {
      return NextResponse.json(
        { ok: false, error: "MODE_LOCKED", message: "Criminology report is locked until Challenge time requirement is met." },
        { status: 403 }
      );
    }

    const report = await generateCriminologyReport({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      userId,
      windowDays,
      conversationIds,
      minutes: { chatMinutes: progress?.chat_minutes, challengeMinutes: progress?.challenge_minutes },
    });

    // Save (optional but recommended)
    const { data: saved, error: saveErr } = await sb
      .from("criminology_reports")
      .insert({
        user_id: userId,
        window_days: windowDays,
        conversation_ids: conversationIds ?? null,
        report,
        confidence: report.meta.confidence,
        disclaimer_version: "v1",
      })
      .select("id,created_at")
      .single();

    if (saveErr) {
      // still return the report even if saving fails
      return NextResponse.json({ ok: true, report, saved: null, saveError: saveErr.message });
    }

    return NextResponse.json({ ok: true, report, saved });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}




import { createClient } from "@supabase/supabase-js";

function trimToChars(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max) + "\n...[trimmed]";
}

type Msg = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
  mode: "chat" | "challenge" | "bored" | "criminology" | string;
  conversation_id: string;
};

async function tryFetch(sb: any, table: string, sinceIso: string, userId: string, conversationIds?: string[]) {
  // Try a few likely column sets
  const selects = [
    "role,content,created_at,mode,conversation_id,user_id",
    "role,text as content,created_at,mode,conversation_id,user_id",
    "sender_role as role,content,created_at,mode,conversation_id,user_id",
    "sender_role as role,text as content,created_at,mode,conversation_id,user_id",
  ];

  for (const sel of selects) {
    let q = sb
      .from(table)
      .select(sel)
      .eq("user_id", userId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (conversationIds?.length) q = q.in("conversation_id", conversationIds);

    const { data, error } = await q;
    if (!error && Array.isArray(data)) {
      // Normalize
      const out: Msg[] = data
        .filter((m: any) => m?.role && (m?.content ?? m?.text))
        .map((m: any) => ({
          role: m.role,
          content: String(m.content ?? m.text ?? ""),
          created_at: String(m.created_at),
          mode: String(m.mode ?? "chat"),
          conversation_id: String(m.conversation_id),
        }));
      if (out.length



import type { CriminologyReportV1 } from "./types";

export type ReportCard =
  | { type: "header"; title: string; subtitle: string; chips: string[] }
  | { type: "callout"; title: string; body: string; tone: "neutral" | "warning" }
  | { type: "section"; title: string; bullets?: string[]; body?: string; collapsedByDefault?: boolean }
  | { type: "compare"; title: string; leftTitle: string; leftBody: string; rightTitle: string; rightBody: string; shifts: string[] }
  | { type: "footer"; evidenceStrength: "low" | "medium" | "high"; confidence: number; correctionHint: string };

export function evidenceStrength(confidence: number): "low" | "medium" | "high" {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.4) return "medium";
  return "low";
}

export function buildReportCards(r: CriminologyReportV1): ReportCard[] {
  const strength = evidenceStrength(r.meta.confidence);

  const cards: ReportCard[] = [];

  cards.push({
    type: "header",
    title: "Criminology Report",
    subtitle: `Window: last ${r.meta.windowDays} days`,
    chips: [
      `${r.meta.sources.conversationCount} convos`,
      `${r.meta.sources.messageCount} msgs`,
      strength === "high" ? "Evidence: strong" : strength === "medium" ? "Evidence: moderate" : "Evidence: limited",
    ],
  });

  // Disclaimers (compact)
  cards.push({
    type: "callout",
    title: "Read this first",
    body: r.disclaimers.join("\n"),
    tone: "warning",
  });

  cards.push({
    type: "section",
    title: "Overview",
    body: `${r.overview.whatThisIs}\n\nWhat this is NOT:\n${r.overview.whatThisIsNot}`,
    collapsedByDefault: false,
  });

  cards.push({
    type: "compare",
    title: "Chat vs Challenge",
    leftTitle: "Chat",
    leftBody: r.comparative.chatPatternSummary,
    rightTitle: "Challenge",
    rightBody: r.comparative.challengePatternSummary,
    shifts: r.comparative.notableShifts ?? [],
  });

  cards.push({
    type: "section",
    title: "Cognitive style",
    bullets: [
      ...(r.cognitiveStyle.strengths?.map((s) => `Strength: ${s}`) ?? []),
      ...(r.cognitiveStyle.riskPatterns?.map((s) => `Risk pattern: ${s}`) ?? []),
      ...(r.cognitiveStyle.distortionWatchlist?.map((s) => `Watchlist: ${s}`) ?? []),
    ],
    collapsedByDefault: false,
  });

  cards.push({
    type: "section",
    title: "Regulation & load",
    bullets: [
      ...(r.regulation.triggersLikely?.map((s) => `Likely trigger: ${s}`) ?? []),
      ...(r.regulation.groundingThatHelps?.map((s) => `Helps: ${s}`) ?? []),
    ],
    collapsedByDefault: true,
  });

  cards.push({
    type: "section",
    title: "Manipulation concerns (non-diagnostic)",
    bullets: [
      ...(r.manipulationConcernModule.realityChecks?.map((s) => `Reality check: ${s}`) ?? []),
      ...(r.manipulationConcernModule.proSocialAnchors?.map((s) => `Pro-social anchor: ${s}`) ?? []),
      ...(r.manipulationConcernModule.redFlagsToMonitor?.map((s) => `Red flag to monitor: ${s}`) ?? []),
    ],
    collapsedByDefault: true,
  });

  cards.push({
    type: "section",
    title: "Recommendations",
    bullets: [
      ...(r.recommendations.nextSteps?.map((s) => `Next step: ${s}`) ?? []),
      ...(r.recommendations.questionsToAskYourself?.map((s) => `Question: ${s}`) ?? []),
    ],
    collapsedByDefault: false,
  });

  cards.push({
    type: "footer",
    evidenceStrength: strength,
    confidence: r.meta.confidence,
    correctionHint:
      "If anything here feels wrong or missing, tap: “Correct this report” and tell Arbor what to change.",
  });

  return cards;
}



import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get("userId") ?? "");
    const limit = Math.min(50, Number(searchParams.get("limit") ?? 10));

    if (!userId) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await sb
      .from("criminology_reports")
      .select("id,created_at,window_days,confidence")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, reports: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = String(searchParams.get("userId") ?? "");
    const id = String(searchParams.get("id") ?? "");

    if (!userId || !id) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await sb
      .from("criminology_reports")
      .select("id,created_at,window_days,confidence,report")
      .eq("user_id", userId)
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, item: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: e?.message }, { status: 500 });
  }
}



create table if not exists public.rate_limits (
  user_id uuid not null,
  key text not null,
  last_ts timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.rate_limits enable row level security;

create policy "rate_limits_select_own" on public.rate_limits
for select using (auth.uid() = user_id);

create policy "rate_limits_upsert_own" on public.rate_limits
for insert with check (auth.uid() = user_id);

create policy "rate_limits_update_own" on public.rate_limits
for update using (auth.uid() = user_id);



import { createClient } from "@supabase/supabase-js";

export async function enforceRateLimit(args: {
  supabaseUrl: string;
  serviceKey: string;
  userId: string;
  key: string; // e.g. "criminology_generate"
  minMinutes: number; // e.g. 360 for 6 hours
}) {
  const sb = createClient(args.supabaseUrl, args.serviceKey, { auth: { persistSession: false } });

  const { data } = await sb
    .from("rate_limits")
    .select("last_ts")
    .eq("user_id", args.userId)
    .eq("key", args.key)
    .maybeSingle();

  const now = Date.now();
  const last = data?.last_ts ? new Date(data.last_ts).getTime() : 0;
  const deltaMin = (now - last) / 60000;

  if (last && deltaMin < args.minMinutes) {
    return { allowed: false, retryAfterMinutes: Math.ceil(args.minMinutes - deltaMin) };
  }

  await sb.from("rate_limits").upsert(
    { user_id: args.userId, key: args.key, last_ts: new Date().toISOString() },
    { onConflict: "user_id,key" }
  );

  return { allowed: true, retryAfterMinutes: 0 };
}


import { enforceRateLimit } from "@/lib/rateLimit";

// ...
const rl = await enforceRateLimit({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  userId,
  key: "criminology_generate",
  minMinutes: 360, // 6 hours
});

if (!rl.allowed) {
  return NextResponse.json(
    { ok: false, error: "RATE_LIMITED", retryAfterMinutes: rl.retryAfterMinutes },
    { status: 429 }
  );
}



export function crisisTripwire(text: string): boolean {
  const t = (text || "").toLowerCase();
  const phrases = [
    "i want to die",
    "kill myself",
    "end it",
    "suicide",
    "i'm going to hurt myself",
    "i don't want to live",
  ];
  return phrases.some((p) => t.includes(p));
}

export function crisisResponse() {
  return {
    meta: {
      version: "v1",
      generatedAt: new Date().toISOString(),
      windowDays: 0,
      sources: { conversationCount: 0, messageCount: 0 },
      confidence: 0,
    },
    disclaimers: [
      "I can’t generate a reflective report right now because safety comes first.",
      "If you’re in immediate danger or considering self-harm, contact local emergency services now.",
      "If you can, reach out to a trusted person nearby.",
    ],
    overview: {
      whatThisIs: "A safety-first response.",
      whatThisIsNot: "Not a diagnosis or a judgment.",
    },
    comparative: { chatPatternSummary: "", challengePatternSummary: "", notableShifts: [] },
    cognitiveStyle: { strengths: [], riskPatterns: [], distortionWatchlist: [] },
    regulation: { triggersLikely: [], groundingThatHelps: ["Take one slow breath in, longer breath out. Repeat 5 times."] },
    manipulationConcernModule: { realityChecks: [], redFlagsToMonitor: [], proSocialAnchors: [] },
    recommendations: { nextSteps: ["Contact local emergency help now.", "Reach out to someone you trust."], questionsToAskYourself: [] },
  };
}



import { crisisTripwire, crisisResponse } from "@/lib/safety/crisis";

// ...
const combined = `${chatExcerpts}\n${challengeExcerpts}`;
if (crisisTripwire(combined)) {
  return crisisResponse() as any;
}


if (report.meta.confidence < 0.35) {
  report.disclaimers.unshift("Evidence is limited. Treat this report as hypotheses, not conclusions.");
}






create table if not exists public.user_progress (
  user_id uuid primary key,

  chat_minutes int not null default 0,
  challenge_minutes int not null default 0,

  challenge_unlocked boolean not null default false,
  criminology_unlocked boolean not null default false,

  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

create policy "progress_select_own" on public.user_progress
for select using (auth.uid() = user_id);

create policy "progress_update_own" on public.user_progress
for update using (auth.uid() = user_id);

create policy "progress_insert_own" on public.user_progress
for insert with check (auth.uid() = user_id);



// app/api/activity/heartbeat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { userId, mode, minutes } = await req.json();
  if (!userId || !mode || !minutes) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await sb
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .single();

  const progress = data ?? {
    user_id: userId,
    chat_minutes: 0,
    challenge_minutes: 0,
    challenge_unlocked: false,
    criminology_unlocked: false,
  };

  if (mode === "chat") progress.chat_minutes += minutes;
  if (mode === "challenge") progress.challenge_minutes += minutes;

  // 🔓 Unlock rules (LOCK THESE)
  if (!progress.challenge_unlocked && progress.chat_minutes >= 3000) {
    progress.challenge_unlocked = true; // 50 hours
  }

  if (
    progress.challenge_unlocked &&
    !progress.criminology_unlocked &&
    progress.challenge_minutes >= 3000
  ) {
    progress.criminology_unlocked = true; // 50 hours
  }

  await sb.from("user_progress").upsert(progress);

  return NextResponse.json({
    ok: true,
    challengeUnlocked: progress.challenge_unlocked,
    criminologyUnlocked: progress.criminology_unlocked,
  });
}



if (mode === "challenge" && !progress.challenge_unlocked) {
  return NextResponse.json(
    { ok: false, error: "MODE_LOCKED", required: "50 hours chat" },
    { status: 403 }
  );
}



if (!progress.criminology_unlocked) {
  return NextResponse.json(
    { ok: false, error: "MODE_LOCKED", required: "50 hours challenge" },
    { status: 403 }
  );
}



// memory rules (conceptual lock)
- Never auto-store trauma
- Ask consent when sensitive
- Allow "high-level only" memory
- Allow delete/export always
- Never infer facts not stated



If user asks:
"Am I a psychopath / narcissist / evil?"

Response:
- Do NOT answer directly
- Explain limits
- Reframe with observed behaviors
- Encourage professional help if needed