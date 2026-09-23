# Arbor — first associative-learning mathematics experiment

**Stage:** isolated proof of concept, synthetic fixtures, no ARK/Grove/LLM connectivity. Does **not** constitute a new LLM, general understanding, or demonstrated biological neuroplasticity. Linked implementation: `associativeLearningLab.ts`; frozen fixtures/experiment: `associativeLearningBenchmark.ts`.

## Question
Can a small, online-updated numerical router choose a suitable **kind of pathway** for previously unseen recombinations of known language cues, without memorizing each complete utterance or retraining Qwen?

The narrow answer in this lab: yes for **10 of 12** synthetic holdout sentences in three preselected categories, **2 abstentions**, versus **0 of 12** for an exact-whole-phrase lookup. This is not an external benchmark, strong semantic generalization, natural-language generation, or evidence that this design surpasses contemporary LLMs. Training and held-out utterances were written for this demonstration; their words and topics substantially overlap. There was **no unseen-template or real-world human test**.

## Model in mathematics

Let `x` be an utterance and `phi(x)` its sparse, hand-engineered binary word and adjacent-word-pair feature vector (plus bias). Let `K={identity,objective,celebration}` be a small **fixed** routing vocabulary; neither names nor conversational facts are extracted or stored.

The route score is `z_k = W_k · phi(x)` and the distribution is `p_k = exp(z_k - max(z)) / sum_j exp(z_j - max(z))`.

For a trusted externally verified example labeled `y`, online cross-entropy gradient descent applies:

`W_{k,f} <- W_{k,f} + eta * (I[k=y] - p_k) * phi_f(x)`.

The small demo uses `eta=0.18` and eight learning passes per distinct labeled receipt, **24** training sentences total. Receipt replay is idempotent; an attempt to reuse the receipt for a conflicting label is rejected. The system checks supplied owner/project scope but does not independently authenticate the receipt or scope; a trusted host would have to do that. Word features are not understanding of pronouns, negation, or identities.

The router only emits a route when top probability is at least `0.55` and the top-two probability margin is at least `0.13`. Otherwise it abstains. Neither probabilities nor learned weights are factual truth, durable memory, authorization, safety decisions, or model quality scores.

## Connection to EXISTING pathway code

The recovered `neuralPathwayNetwork.ts` accepts exact cues. This experiment converts the selected route into a narrowly scoped cue such as `route:objective` and calls `activateAssociatedSystems`. It returns **suggested systems and matched pathway IDs**, always `grantsExecution:false`. A suppressed association remains suppressed; it never causes actions or writes ARK. Existing memory candidate confidence stays separate from the learned routing weight.

## Fixed outcome (local Node 22 isolated run)

| Probe | Frozen result |
| --- | --- |
| Training examples | 24 synthetic, eight per class |
| Held-out sentences | 12 synthetic, four per class, none whole-sentence duplicates |
| Exact-whole-sentence lookup | 0/12 |
| Online sparse-feature router | 10/12 |
| Abstentions | 2/12: `What is my name?`; `You called me the wrong name` |
| Confident incorrect classifications in this tiny holdout | 0 (NOT a general reliability bound) |
| Production tasks, Qwen inference, deployment | 0 |

The exact-sentence lookup is a deliberately weak baseline, not an LLM, bag-of-words classifier or existing ARK retrieval baseline. Both train and test share much vocabulary, templates and topics. For honest follow-up, freeze a larger held-out set BEFORE tuning and compare against a majority-class, TF-IDF/linear model, and existing model under matched conditions.

## What failed or remains untested

- No mathematical extraction of who owns a nickname. `identity` is only a routing label, not an ownership fact. The example `Firefly is my nickname` cannot become a verified user fact through this classifier.
- Explicit negation and conversational permissions remain unresolved (`do not continue` could still route toward the objective system); a trusted execution guard must separately interpret consent and veto actions.
- No independent generation of natural language; no model trained from scratch; no proof of general reasoning or complex out-of-distribution transfer.
- Weight updates need externally **verified** labels, project and conversation authorization, evidence provenance, and privacy review before real data. The current program checks receipt nonemptiness and uniqueness, not validity.
- No durable storage, rollback/versioning, multi-user concurrent update protocol, temporal context, source trace from text to relationship, or novel graph topology induction yet.
- A future prospective evaluation must include ambiguous cues, negation, contradictions, new syntactic structures, wrong user/project, stale receipts, sign-out, unsafe requests, and false completion claims.

## Ordered next science gates

1. Keep #188 draft and isolate this lab as a stacked child; pass exact-head CI and independent review of the fixture split.
2. Review the May original scaffold against the bounded reconstruction; preserve any original design not represented here.
3. Replace this toy route task with source-grounded **relation learning**: `speaker —(has_nickname)—> alias`, attribution and provenance; distinguish facts from association strengths and reversible competing hypotheses.
4. Establish versioned, atomic, owner/project/conversation-scoped storage and verified corrections, then demonstrate safe interrupted/replayed training.
5. Pre-register genuinely out-of-template, out-of-name, long-horizon, adversarial/negative holdouts and strong baselines. No automatic pass from a chosen toy set.
6. Only after those gates investigate architectures for concept-node activation and graph updates, with a separate language generator and formal mathematical/computational comparison. ARK could coordinate experiments; it does not spontaneously discover a new model without a built experimental loop.
7. Real ARK/Layer/Grove integration only through reviewed owner-authenticated read-only context (#160, #179), protected inference host, feature-off default, and explicit release decision. No crossover to the public app or private user corpus.