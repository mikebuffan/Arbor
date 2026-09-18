# Arbor Environment — House Has Walls v1

Status: implementation foundation
Base: `arbor/permanence-runtime-main`
ARK boundary: DO NOT MODIFY ARK runtime/orchestration in this branch.

## Evidence-first frontend map

The existing client is Flutter and already targets Android, iOS, web, Windows, macOS, and Linux. Preserve that cross-platform foundation.

Existing pieces to reuse/refactor:
- `lib/main.dart`: Supabase bootstrap + ArborApp
- `lib/pages/arbor_shell_page.dart`: text/voice shell and transition
- `lib/pages/chat_test_page.dart`: authenticated text conversation + durable shared session IDs
- `lib/pages/voice_page.dart`: voice lifecycle and shared ArborSession
- `lib/widgets/arbor_visual.dart`: animated Arbor presence states
- `lib/theme/arbor_theme.dart`: current minimal dark theme
- `lib/widgets/glass_pill_button.dart`: existing glass control primitive
- `lib/widgets/arbor_background.dart`: legacy magenta background
- `lib/pages/home_shell.dart` + `lib/ui/phone_frame.dart`: older phone-mock shell; historical/reference rather than the new environment architecture

## Design direction

Identity: enchanted cosmic forest observatory + serious command center.
The interface must remain operationally legible. Atmosphere never obscures state.

Core surfaces:
1. Home
2. Conversation
3. Current Objective
4. Work Queue
5. Projects
6. Context Codex
7. Pattern Hop
8. Memory & State
9. Evidence / Provenance
10. Testing & Benchmarks
11. Tools & Connectors
12. System Health
13. Security / Authorization
14. Activity / History
15. Settings

## Truth contract

The UI MUST NOT infer operational success from animation or elapsed time.
- WORKING requires confirmed executing state.
- CHECKPOINT SAVED requires a checkpoint record/receipt.
- BLOCKED requires a concrete blocker.
- COMPLETE requires completion evidence.
- stale/degraded state is visibly marked.
- fixture-backed operational UI is visibly marked DEMO DATA.
- unknown remains unknown; never fabricate progress.

## ARK adapter boundary

Until exact ARK checkpoint `2bc30e1` is recovered and verified:
- no ARK runtime changes
- no duplicate objective/work orchestration
- no guessed ARK API
- no live ARK status claims
- UI may define typed view models and adapters, but ARK data sources remain fixture/demo or unavailable.

## First implementation slice

"The House Has Walls":
- responsive environment shell
- navigation
- design tokens
- reusable glass panels/controls
- persistent objective strip
- global status
- Home
- Conversation integration
- Work Queue demo surface
- Inspector
- command palette
- accessibility/reduced-motion foundation
- truthful fixture state model

## Current source findings

The current visual system is predominantly near-black + magenta/pink. Environment v1 will evolve it toward midnight navy, forest teal/cyan, restrained violet, warm amber/firefly accents, while retaining compatibility with existing Arbor presence code until the new tokens are fully adopted.

The existing `ArborVisual` has idle/listening/thinking/speaking states. These are conversational-presence states, NOT proof of autonomous work execution; environment operational state must remain separate.

The current shell already shares project/conversation continuity between text and voice through `ArborSession`. Preserve that behavior while introducing the larger environment shell.

## Implementation rule

Read → map → preserve working behavior → introduce tokens/primitives → shell → demo state → screens → tests → build → visual reconciliation.

No production merge/deploy from this branch.
