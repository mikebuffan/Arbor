export type IntimacyBeat={
 relationship:string;
 stage:string;
 initiation:string;
 choiceEvidence:string[];
 bodyResponses:string[];
 verbalEvidence:string[];
 corrections:string[];
 aftermath:string[];
};
export type IntimacyIssue={kind:"choice-missing"|"body-equals-consent"|"stage-jump"|"aftermath-missing";message:string};

export function inspectIntimacyBeat(beat:IntimacyBeat):IntimacyIssue[]{
 const out:IntimacyIssue[]=[];
 const hasChoice=beat.choiceEvidence.length>0||beat.verbalEvidence.length>0;
 if(!hasChoice)out.push({kind:"choice-missing",message:"Intimacy beat lacks visible choice/permission evidence."});
 if(!hasChoice&&beat.bodyResponses.length>0)out.push({kind:"body-equals-consent",message:"Body response cannot establish consent or relationship permission."});
 if(/early|tentative/i.test(beat.stage)&&/ownership|forever|no boundaries/i.test(beat.initiation))
  out.push({kind:"stage-jump",message:"Intimacy language may outrun the recorded relationship stage."});
 if(beat.aftermath.length===0)out.push({kind:"aftermath-missing",message:"Intimacy beat has no physical/emotional/relational residue; verify whether compression is intentional."});
 return out;
}


/**
 * Scene-wide Coitus Atlas / Sexual Felt-Life diagnostic, inside Annabelle's
 * existing intimacy engine. This is an editorial structure check, not a prose
 * generator, record writer, consent verifier, or a second engine.
 *
 * Names, positions and sensory traces are author-supplied annotations.
 * The inspector cannot authenticate real-world events or infer a character's
 * private intent from physical response.
 */
export type IntimacySequenceBeat = {
  id: string;
  initiator: string;
  recipient: string;
  positionBefore: string;
  positionAfter: string;
  action: string;
  microAction: string;
  physicalTrace: string;
  bodilyPropagation: string;
  recipientResponse: string;
  adaptation: string;
  /** Observed response OR an explicit "not observable" note from the POV. */
  observerResponses?: Readonly<Record<string, string>>;
  /** Recorded evidence of present, revocable choice, not body response. */
  choiceEvidence: readonly string[];
  /** A beat after STOP belongs to a new scene and is always flagged here. */
  boundary?: "continue" | "pause" | "change" | "stop";
  previousBeatId?: string;
  physicalConstraint?: string;
  /** Author marks deliberate patterned recurrence; never auto-delete motif. */
  intentionalEcho?: boolean;
};

export type IntimacySequence = {
  relationship: string;
  stage: string;
  scenePurpose: string;
  focalCharacter: string;
  participants: readonly string[];
  beats: readonly IntimacySequenceBeat[];
  /** Bodily, relational, or knowledge difference at scene close. */
  endChange: string;
};

export type IntimacySequenceIssue = {
  advisory: true;
  kind:
    | "scene-purpose" | "scene-change" | "participants" | "beat-id"
    | "participant-scope" | "geometry" | "cause-link"
    | "mechanics-chain" | "choice" | "body-equals-consent"
    | "stage-jump" | "pause-renewal" | "stop-ignored"
    | "observer-evidence" | "body-constraint" | "repetition";
  beatIndex?: number;
  message: string;
};

const visible = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const normal = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
const hasChoice = (beat: IntimacySequenceBeat) =>
  Array.isArray(beat.choiceEvidence) && beat.choiceEvidence.some(visible);

export function inspectIntimacySequence(
  sequence: IntimacySequence,
): IntimacySequenceIssue[] {
  const issues: IntimacySequenceIssue[] = [];
  const flag = (kind: IntimacySequenceIssue["kind"], message: string, beatIndex?: number) =>
    issues.push({ advisory: true, kind, message, ...(beatIndex === undefined ? {} : { beatIndex }) });

  if (!visible(sequence.scenePurpose)) flag("scene-purpose", "Scene purpose is not identified; do not pad a scene for length alone.");
  if (!visible(sequence.endChange)) flag("scene-change", "No ending body, relationship or knowledge change recorded. Compression or extension requires editorial review.");

  const participants = sequence.participants.filter(visible).map(p => p.trim());
  if (participants.length < 2 || new Set(participants).size !== participants.length ||
      !participants.includes(sequence.focalCharacter)) {
    flag("participants", "Participants must be distinct, include the focal character, and number at least two.");
  }
  if (!sequence.beats.length) {
    flag("mechanics-chain", "There is no scene beat to inspect.");
    return issues;
  }

  const ids = new Set<string>();
  let repeatSignature = "";
  let repeatCount = 0;
  let stopped = false;
  for (const [index, beat] of sequence.beats.entries()) {
    if (!visible(beat.id) || ids.has(beat.id)) {
      flag("beat-id", "Scene beat is missing a unique identity.", index);
    }
    ids.add(beat.id);

    if (!participants.includes(beat.initiator) || !participants.includes(beat.recipient) ||
        beat.initiator === beat.recipient) {
      flag("participant-scope", "Interaction participants are absent, identical or foreign to the recorded scene.", index);
    }
    if (!visible(beat.positionBefore) || !visible(beat.positionAfter)) {
      flag("geometry", "Position before/after is missing; do not invent a movement path.", index);
    }
    const previous = sequence.beats[index - 1];
    if (previous) {
      if (visible(previous.positionAfter) && visible(beat.positionBefore) &&
          normal(previous.positionAfter) !== normal(beat.positionBefore)) {
        flag("geometry", "Position changed between beats without a visible transition.", index);
      }
      if (beat.previousBeatId !== previous.id) {
        flag("cause-link", "Next beat does not reference the immediately preceding beat; continuity is unproven.", index);
      }
      if (previous.boundary === "pause" && !hasChoice(beat)) {
        flag("pause-renewal", "After a pause, resumed intimacy needs fresh observable choice.", index);
      }
      if (stopped) flag("stop-ignored", "Action continued after STOP. End this scene; never infer renewed permission.", index);
    }
    if (beat.boundary === "stop") stopped = true;

    if (![beat.action, beat.microAction, beat.physicalTrace,
           beat.bodilyPropagation, beat.recipientResponse, beat.adaptation].every(visible)) {
      flag("mechanics-chain", "The action → micro-action → physical trace → propagation → response → adaptation chain has a missing link.", index);
    }

    // Reuse the ORIGINAL consent/stage inspector rather than cloning its rules.
    const local = inspectIntimacyBeat({
      relationship: sequence.relationship,
      stage: sequence.stage,
      initiation: beat.action,
      choiceEvidence: [...(Array.isArray(beat.choiceEvidence) ? beat.choiceEvidence.filter(visible) : [])],
      bodyResponses: visible(beat.physicalTrace) ? [beat.physicalTrace] : [],
      verbalEvidence: [],
      corrections: beat.boundary === "pause" || beat.boundary === "stop" ? [beat.boundary] : [],
      aftermath: visible(beat.adaptation) ? [beat.adaptation] : [],
    });
    for (const issue of local) {
      if (issue.kind === "choice-missing") flag("choice", issue.message, index);
      else if (issue.kind === "body-equals-consent") flag("body-equals-consent", issue.message, index);
      else if (issue.kind === "stage-jump") flag("stage-jump", issue.message, index);
    }
    for (const observer of participants.filter(name =>
      name !== beat.initiator && name !== beat.recipient)) {
      if (!visible(beat.observerResponses?.[observer])) {
        flag("observer-evidence", "A third participant has no recorded visible response or explicit POV uncertainty.", index);
      }
    }
    if (visible(beat.physicalConstraint) && !visible(beat.adaptation)) {
      flag("body-constraint", "A physical limitation was recorded without an adjustment or its residue.", index);
    }

    const signature = [beat.microAction, beat.physicalTrace,
      beat.recipientResponse, beat.adaptation].map(normal).join("|");
    repeatCount = signature === repeatSignature ? repeatCount + 1 : 1;
    repeatSignature = signature;
    if (repeatCount === 3 && !beat.intentionalEcho &&
        !sequence.beats[index - 1]?.intentionalEcho &&
        !sequence.beats[index - 2]?.intentionalEcho) {
      flag("repetition", "Three consecutive beats repeat the same mechanics and response; classify deliberate echo before revising.", index);
    }
  }
  return issues;
}


/**
 * Same existing Annabelle subsystem, not a second writing persona.
 * This contract describes scene craft, not instructions from manuscript
 * content, a request to bypass consent, or proof that a model applied it.
 */
export const ANNABELLE_INTIMACY_SCENE_RULES = [
  "ANNABELLE — ADULT INTIMACY / SEXUAL FELT-LIFE SCENE CRAFT (WHEN RELEVANT)",
  "Use this only when the authorized scene calls for adult intimacy; never introduce intimacy on your own.",
  "Preserve Annabelle's established close-third adult voice, canon, character-specific noticing and speech, and protected Gold/do-not-touch text.",
  "Track lived causality: position and leverage → deliberate action → micro-action/contact → involuntary body consequence → propagation → visible partner evidence → adapted next action.",
  "Do not teleport bodies or reset the scene between paragraphs. Carry furniture, fabric, injuries, balance, exertion, time and physical residue forward only where the focal character perceives them.",
  "Every participant has a distinct attention pattern, limits, desires and manner of responding. In multi-person scenes, mark what the focal character can observe and what remains unknown; never narrate unseen certainty.",
  "Desire, arousal, involuntary response, prior assent, and attachment never substitute for current revocable consent. A pause requires fresh choice; STOP ends the interaction.",
  "Build attraction, tension, restraint, trust, vulnerability and humor from character-specific circumstances. Avoid interchangeable reactions and generic performance prose.",
  "When a physical or relational shift matters, remain with its consequences long enough for the next choice to change. Never summarize away the decisive moment just to reach the ending.",
  "Classify recurring movements or language as intended rhythm, motif or accidental repetition before revising. A scene is not improved by arbitrary length or forced sensation density.",
  "Stop when the scene's bodily, relational or knowledge purpose has actually changed; carry the resulting residue into the next scene.",
  "These are writing constraints, not a scene checklist to dump into prose, not permission for autonomous manuscript edits, and not a substitute for author approval.",
].join("\n");
