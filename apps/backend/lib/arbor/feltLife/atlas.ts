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
  e("cross-dread","cross-sensory",["dread","something is wrong","waiting for bad news","pit in stomach"],
    ["abdominal drop","jaw tension","held breath"],["attention searches ahead for threat"],["dread","anticipatory fear"],
    ["delay","check exits","rehearse"],["uncertain threat","waiting"],["weight low in the gut","room gone narrow"],"unpleasant","high"),
  e("cross-grief","cross-sensory",["grief","miss them","gone","loss","funeral"],
    ["chest pressure","throat constriction","energy drop"],["memory intrudes unevenly"],["grief","longing"],
    ["go still","seek familiar objects","withdraw or reach"],["bereavement","separation"],["ache with nowhere to go","ordinary things turning sharp"],"unpleasant","medium"),
  e("cross-anger-contained","cross-sensory",["angry","furious","pissed","holding it in"],
    ["jaw set","heat","hands tense"],["attention fixes on violation"],["anger","resolve"],
    ["go quiet","shorten speech","control movement"],["conflict","boundary"],["too still","heat under the skin"],"unpleasant","high"),
  e("cross-anticipation-positive","cross-sensory",["can't wait","excited","looking forward","almost here"],
    ["forward energy","light stomach flutter"],["future scene rehearses"],["anticipation","hope"],
    ["check time","prepare","move faster"],["reunion","event","reward"],["pulled forward","time suddenly slow"],"pleasant","medium"),
  e("cross-reunion","cross-sensory",["reunion","finally here","came back","home again"],
    ["breath disruption","orientation locks onto person"],["absence and presence overlap"],["relief","love","disbelief"],
    ["approach","touch","pause before moving"],["return","reconnection"],["recognition before thought","distance collapsing"],"mixed","high"),
  e("cross-shame","cross-sensory",["ashamed","embarrassed","humiliated","everyone saw"],
    ["face heat","posture contracts","eye contact changes"],["self-monitoring spikes"],["shame","embarrassment"],
    ["hide","deflect","repair image"],["social exposure","mistake"],["heat with nowhere to put it","wanting less surface area"],"unpleasant","high"),
  e("cross-desire","cross-sensory",["want him","want her","desire","turned on","aroused"],
    ["attention to contact","temperature change","muscle readiness"],["salient person cues intensify"],["desire","anticipation"],
    ["move closer or hold still","seek or avoid contact"],["consensual attraction","intimacy"],["attention caught on distance","body leaning before decision"],"pleasant","high"),
  e("cross-post-stress-drop","cross-sensory",["after adrenaline","shaking after","it's over","crash after"],
    ["tremor","weakness","temperature shift"],["processing lags behind event"],["relief","exhaustion","residual alarm"],
    ["sit","seek water","go quiet"],["post-threat","aftermath"],["body arriving late","strength leaving all at once"],"mixed","medium"),
  e("cross-trust-tentative","cross-sensory",["trust him","trust her","maybe safe","let them help"],
    ["guard softens without disappearing","breathing changes"],["monitoring remains but widens"],["tentative trust","hope"],
    ["allow proximity","accept help","test boundary"],["developing relationship"],["room for one more inch","guard not gone, just lower"],"mixed","medium"),
  e("cross-loneliness","cross-sensory",["lonely","alone","nobody here","miss people"],
    ["low activation","restless stillness"],["social absence becomes salient"],["loneliness","longing"],
    ["seek contact","scroll","withdraw"],["isolation","disconnection"],["too much room","silence with weight"],"unpleasant","low"),
  e("cross-quiet-contentment","cross-sensory",["content","peaceful","quiet together","comfortable silence"],
    ["muscle ease","unforced breathing"],["attention broadens without urgency"],["contentment","belonging"],
    ["linger","continue ordinary task"],["home","trusted company"],["nothing asking to be fixed","easy quiet"],"pleasant","low"),
  e("movement-pain-protection","movement",["limp","bad hip","injured leg","pain when walking","favoring"],
    ["weight shifts away","range shortens","compensatory tension"],["route and support become salient"],["frustration possible","caution"],
    ["brace","choose shorter movement","use furniture"],["injury","chronic pain"],["movement negotiated","weight placed carefully"],"unpleasant","medium"),
  e("temperature-heat-overload","temperature",["too hot","sweating","stifling","humid"],
    ["skin heat","sweat","slower movement"],["cooling options become salient"],["irritation","fatigue"],
    ["seek air","remove layer","drink"],["summer","crowded room"],["air sticking to skin","heat collecting at collar"],"unpleasant","medium"),
  e("smell-rain-city","smell",["rain smell","wet street","wet pavement","after rain"],
    ["orientation to air and ground"],["place memory may activate"],["neutral","nostalgia possible"],
    ["notice street","breathe in"],["city rain","arrival"],["mineral damp","water lifting old street smells"],"neutral","low"),
  e("sound-crowd-belonging","sound",["bar noise","crowd","laughter around","people talking"],
    ["attention shifts among voices","body calibrates to group rhythm"],["social field broadens"],["belonging","overwhelm possible"],
    ["lean closer","track familiar voice"],["bar","party","found family"],["voices crossing","laughter arriving from behind"],"mixed","medium"),
  e("touch-care-with-choice","touch",["helped me up","offered hand","held out hand","waited for me"],
    ["orientation toward offered contact","guard may soften"],["choice remains salient"],["care","trust possible"],
    ["accept or decline","set pace"],["caregiving","recovery"],["an offered hand, not a claim","space left for no"],"pleasant","low"),
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
