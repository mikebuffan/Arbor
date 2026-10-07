# Identity Assurance Core — Source-Only Scaffold

Base: `integration/one-arbor-pre-vercel-20261006` @ `65be4dc3ac59997d6bb0ee800648293b45932b6e`

This lane begins the shared Arbor/Grove identity-assurance policy without
activating live authentication, biometrics, surveillance, or hidden credentials.

## Design rules

- Identity and authorization are separate.
- Prompt text never grants authority by itself.
- Behavioral language (including future Danelle-ese modeling) is a recognition
  signal, never a sole identity proof.
- Raw biometric templates do not belong in Arbor application state. Future
  biometric support should consume OS/trusted-device attestations only.
- Voice alone is not a root of trust.
- Verified duress/restriction signals fail closed.
- Restricted sessions may continue ordinary conversation while sensitive
  capabilities remain unavailable.
- Elevated actions require step-up authentication.
- A user claim such as "I am Danelle" is not authentication.
- Unknown or suspicious sessions should not be told which factor failed or how
  close they were to passing.
- No secret master backdoor is introduced.

## Current trust states

`unknown -> recognized -> verified -> elevated`

`restricted` is an overriding protective state, not a lower score.

## Current capability classes

- ordinary conversation: available even when restricted
- private read / memory write / ARK submit: require verified
- export / permissions / deployment / spend / security changes: require elevated

These are conservative defaults for the scaffold and should be reviewed against
the actual Grove capability map before live integration.

## Future adapters (not implemented here)

- device/passkey attestation
- OS biometric attestation
- voice + liveness attestation
- prompt provenance capture (typed/pasted/forwarded/retrieved/generated)
- opt-in behavioral-language recognition
- duress enrollment and verifier
- anomaly/session risk signals
- audit receipt persistence
- Grove route integration
- phone step-up UI

No raw face, fingerprint, keystroke, or voice biometric data is collected by
this scaffold.


## Safe phase-two source work added

The isolated lane now also contains:

- prompt provenance advisory assessment:
  - naturally typed / pasted / forwarded / retrieved / generated elsewhere / unknown
  - provenance can request review or step-up but can never grant authority
  - an owner-authorship claim attached to non-native text is recorded as a mismatch signal, not proof of impersonation
- opt-in longitudinal behavioral sequence assessment:
  - before-command similarity
  - command similarity
  - post-command continuity
  - freeform vs possibly scripted / highly constrained input
  - can support recognition or record concern, never verify/elevate identity alone
- non-diagnostic restricted-mode disclosure:
  - sensitive requests can be unavailable without revealing which factor failed
  - never exposes enrolled factors, thresholds, or whether duress caused restriction
- source-only step-up challenge contracts:
  - passkey
  - hardware key
  - device biometric attestation
  - spontaneous-language challenge
  - spontaneous language remains recognition-only; it cannot independently elevate authorization
  - expired/malformed challenge contracts fail closed

## Explicitly not built yet

Still intentionally absent:

- raw keystroke capture
- raw face/fingerprint/voice storage
- behavioral biometric training or scoring model
- secret/duress phrase enrollment
- live passkey verification
- live OS biometric adapter
- liveness/deepfake detection
- Grove route enforcement
- persistence of security audit receipts
- automatic lockout or account recovery

Those require separate privacy/security review and live integration design.
