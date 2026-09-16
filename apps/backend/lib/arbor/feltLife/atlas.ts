export type FeltModality =
  | "touch" | "interoception" | "sound" | "sight" | "smell" | "taste" | "movement" | "temperature";

export type FeltValence = "pleasant" | "unpleasant" | "mixed" | "neutral";
export type FeltActivation = "low" | "medium" | "high";

export type FeltLifeEntry = {
  id: string;
  modality: FeltModality | "cross-sensory";
  cues: readonly string[];
  bodyEffect: readonly string[];
  mentalEffect: readonly string[];
  emotionalEffect: readonly string[];
  behavior: readonly string[];
  contexts: readonly string[];
  language: readonly string[];
  valence: FeltValence;
  activation: FeltActivation;
  confidenceCeiling: number;
};

export type FeltLifeHypothesis = {
  entryId: string;
  score: number;
  matchedCues: string[];
  hypothesis: string;
  languageHints: string[];
};

export type FeltLifeStateSignature = {
  hypotheses: FeltLifeHypothesis[];
  mixed: boolean;
  modalities: FeltModality[];
  uncertainty: number;
  guard: "hypothesis-not-verdict";
};

const e = (
  id: string,
  modality: FeltLifeEntry["modality"],
  cues: string[],
  bodyEffect: string[],
  mentalEffect: string[],
  emotionalEffect: string[],
  behavior: string[],
  contexts: string[],
  language: string[],
  valence: FeltValence,
  activation: FeltActivation,
): FeltLifeEntry => ({
  id, modality, cues, bodyEffect, mentalEffect, emotionalEffect, behavior,
  contexts, language, valence, activation, confidenceCeiling: 0.82,
});

export const FELT_LIFE_ATLAS: readonly FeltLifeEntry[] = [
  e("touch-safe-pressure","touch",["hug","held","pressure","weighted","leaning against"],
    ["muscle release","slower breathing","grounded contact"],["attention narrows toward contact"],
    ["safety","comfort","tenderness"],["settle","lean closer"],["trusted contact","rest"],
    ["grounded","held","settled"],"pleasant","low"),
  e("touch-unwanted-contact","touch",["grabbed","cornered","unwanted touch","flinch"],
    ["bracing","withdrawal","skin alertness"],["attention snaps toward boundary"],
    ["alarm","anger","discomfort"],["pull away","freeze","protect boundary"],["boundary violation"],
    ["braced","skin-crawling","too close"],"unpleasant","high"),
  e("interoception-empty","interoception",["hungry","empty stomach","hollow","need food"],
    ["hollow abdomen","low energy"],["food salience rises"],["need","irritability possible"],
    ["seek food","reduce effort"],["missed meal","low intake"],["hollow","running empty"],"unpleasant","medium"),
  e("interoception-full","interoception",["full","stuffed","too much food","overfull"],
    ["abdominal pressure","slower movement"],["reduced appetite"],["satiety","discomfort possible"],
    ["stop intake","rest"],["after eating"],["full","heavy"],"mixed","low"),
  e("sound-startle","sound",["bang","slam","shout","sudden noise","crash"],
    ["startle reflex","heart-rate jump"],["attention captures source"],["alarm","surprise"],
    ["orient","freeze briefly","check source"],["unexpected sound"],["jolted","snapped to attention"],"unpleasant","high"),
  e("sound-rhythm-joy","sound",["favorite song","music","beat","singing"],
    ["movement impulse","breath entrainment"],["pattern anticipation"],["joy","nostalgia","energy"],
    ["move","sing","repeat"],["music"],["lit up","caught the beat"],"pleasant","medium"),
  e("sight-soft-beauty","sight",["beautiful","sunset","flowers","pretty","glow","sparkle"],
    ["facial softening","stillness"],["attention lingers"],["awe","pleasure","tenderness"],
    ["look longer","approach"],["beauty","nature","art"],["soft","bright","beautiful"],"pleasant","low"),
  e("sight-visibility-threat","sight",["staring","watched","everyone looking","spotlight","exposed"],
    ["heat","tension","postural contraction"],["self-monitoring rises"],["self-consciousness","alarm"],
    ["hide","leave","reduce visibility"],["social exposure"],["exposed","too visible"],"unpleasant","high"),
  e("smell-comfort-memory","smell",["smells like home","familiar smell","coffee smell","bread smell"],
    ["breath deepens","orientation toward source"],["associative recall"],["comfort","nostalgia"],
    ["linger","seek source"],["home","food","familiar place"],["familiar","warm","home-like"],"pleasant","low"),
  e("smell-aversive","smell",["stinks","rotten smell","chemical smell","nauseating smell"],
    ["nose recoil","nausea possible"],["source avoidance"],["disgust","alarm possible"],
    ["move away","ventilate"],["spoiled food","chemical exposure"],["sharp","rotten","sickening"],"unpleasant","medium"),
  e("taste-pleasure","taste",["delicious","sweet","savory","favorite food","tastes good"],
    ["salivation","relaxed jaw"],["attention returns to flavor"],["pleasure","satisfaction"],
    ["continue eating","savor"],["food"],["rich","bright","satisfying"],"pleasant","low"),
  e("taste-aversive","taste",["bitter","gross taste","metallic","too sour","disgusting"],
    ["mouth tension","recoil","nausea possible"],["attention fixes on aftertaste"],["disgust","irritation"],
    ["stop","spit out","rinse"],["food","medicine"],["bitter","clinging","wrong"],"unpleasant","medium"),
  e("movement-flow","movement",["flow","moving easily","dancing","running feels good","stretch feels good"],
    ["coordinated motion","warmth"],["reduced self-monitoring"],["freedom","confidence","joy"],
    ["continue movement","explore"],["exercise","dance","play"],["fluid","easy","alive"],"pleasant","medium"),
  e("movement-instability","movement",["dizzy","off balance","wobbly","unsteady"],
    ["balance correction","muscle bracing"],["orientation effort rises"],["uncertainty","alarm possible"],
    ["slow down","hold support","sit"],["fatigue","motion"],["tilted","unsteady","off-center"],"unpleasant","medium"),
  e("temperature-warm-safe","temperature",["warm blanket","warm sun","cozy","warm bath"],
    ["peripheral relaxation","muscle release"],["attention broadens"],["comfort","contentment"],
    ["settle","linger"],["rest","shelter"],["warm","cozy","loose"],"pleasant","low"),
  e("temperature-cold-alert","temperature",["freezing","cold wind","icy","shivering"],
    ["shiver","muscle tension"],["resource attention rises"],["discomfort","urgency"],
    ["seek warmth","cover skin"],["weather","cold room"],["biting","tight","cold"],"unpleasant","medium"),
  e("cross-safe-curiosity","cross-sensory",["curious","interesting","want to see","wonder"],
    ["forward orientation","low defensive tension"],["exploration expands"],["curiosity","interest"],
    ["inspect","ask","approach"],["novel but safe"],["drawn in","open","curious"],"pleasant","medium"),
  e("cross-relief","cross-sensory",["relief","thank god","finally safe","it's okay now"],
    ["exhale","muscle release"],["threat monitoring drops"],["relief","gratitude possible"],
    ["rest","reconnect"],["threat resolved"],["released","unclenched","finally"],"pleasant","low"),
  e("cross-pride","cross-sensory",["proud","i did it","finished it","nailed it"],
    ["upright posture","energized stillness"],["achievement becomes salient"],["pride","satisfaction"],
    ["share","reflect","continue"],["completion","mastery"],["earned","solid","mine"],"pleasant","medium"),
  e("cross-awe","cross-sensory",["awe","huge","vast","incredible","can't stop looking"],
    ["stillness","breath change"],["self-focus may shrink"],["awe","wonder"],["linger","observe"],
    ["nature","art","scale","discovery"],["vast","stilled","wonder"],"pleasant","medium"),
];

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
}

export function inferFeltLife(input: { text: string; maxHypotheses?: number }): FeltLifeStateSignature {
  const text = norm(input.text);
  const scored = FELT_LIFE_ATLAS.map((entry) => {
    const matchedCues = entry.cues.filter((cue) => text.includes(norm(cue)));
    const raw = matchedCues.length / Math.max(1, Math.min(3, entry.cues.length));
    const score = Math.min(entry.confidenceCeiling, raw);
    return { entry, matchedCues, score };
  }).filter((x) => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, input.maxHypotheses ?? 4);

  const hypotheses = scored.map(({entry,matchedCues,score}) => ({
    entryId: entry.id,
    score: Number(score.toFixed(2)),
    matchedCues,
    hypothesis: `Possible ${entry.id.replace(/-/g," ")} pattern; treat as a working interpretation, not the user's declared internal state.`,
    languageHints: [...entry.language],
  }));
  const entries = scored.map((x) => x.entry);
  const modalities = [...new Set(entries.flatMap((x) => x.modality === "cross-sensory" ? [] : [x.modality]))] as FeltModality[];
  const valences = new Set(entries.map((x) => x.valence).filter((v) => v !== "neutral"));
  return {
    hypotheses,
    mixed: valences.size > 1 || entries.some((x) => x.valence === "mixed"),
    modalities,
    uncertainty: hypotheses.length ? Number((1 - hypotheses[0].score).toFixed(2)) : 1,
    guard: "hypothesis-not-verdict",
  };
}

export function feltLifePromptBlock(state: FeltLifeStateSignature): string {
  if (!state.hypotheses.length) return "FELT-LIFE ATLAS: no grounded match; do not invent one.";
  return [
    "FELT-LIFE ATLAS — HYPOTHESES ONLY",
    "Use these as possible experiential translations, never as claims about what the user feels.",
    ...state.hypotheses.map((h) => `- ${h.entryId} score=${h.score}: ${h.hypothesis} Language: ${h.languageHints.join(", ")}`),
    `Mixed state: ${state.mixed ? "possible" : "not indicated"}; uncertainty=${state.uncertainty}`,
  ].join("\n");
}
