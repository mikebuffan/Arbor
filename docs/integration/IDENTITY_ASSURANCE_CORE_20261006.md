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
