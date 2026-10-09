# Proactive judgment regression fixtures

P01–P12 are the synthetic public-generation and host-only scoring split from
the existing `one_arbor_proactive_E01_C04_20261008.zip` handoff. They supplement
the 16 J cases and 18 legacy conversation cases without changing those packs.

Only `public_generation.json` may be given to inference. Keep the rubric and
condition assignment outside model input. The committed demo assignment is
deterministic and exposed: replace it with a trusted-host randomized assignment
for any authorized blind evaluation. These public cases are regression material,
not a fresh unseen holdout. Human scoring and actual responses remain unrun.

The integration test uses the existing acceptance runner and synthetic fixture
factory with a fake responder. It proves capture/input integrity and rubric
separation, not constructive advice, E01 host wiring or D13 model independence.
No alternative radar, model evaluator, authorization system or engine is added.

Inference-visible evaluation-purpose labels were removed after the three-thread
review. Synthetic-data/authority disclaimers remain. The P public digest and
private assignment/rubric digests were recomputed together. J generation and its
private plan recompute dynamically. Existing human scenarios and expected
answers were not changed. This repair removes one cue; it does not establish
fresh holdouts, evaluator blindness or actual unprimed model behavior.
