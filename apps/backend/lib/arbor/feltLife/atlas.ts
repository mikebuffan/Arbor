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
  e("cross-threat-freeze","cross-sensory",["froze","couldn't move","went still","stopped breathing"],
    ["movement inhibition","breath restriction","peripheral tension"],["attention narrows while action stalls"],["alarm","uncertainty"],
    ["hold still","delay response","scan"],["acute threat","conflict"],["stillness arriving before thought","motion cut off mid-intention"],"unpleasant","high"),
  e("cross-threat-flight","cross-sensory",["need to leave","get out","backed away","ran"],
    ["forward drive","heart-rate rise","muscle recruitment"],["exit routes dominate attention"],["fear","urgency"],
    ["leave","create distance","find exit"],["acute threat","overwhelm"],["distance becoming the only useful fact","body already angled toward the door"],"unpleasant","high"),
  e("cross-threat-fight","cross-sensory",["squared up","ready to fight","hit back","snapped"],
    ["weight sets","hands ready","heat and tension"],["attention fixes on source of threat"],["anger","alarm"],
    ["confront","block","strike or restrain"],["acute threat","boundary defense"],["weight settling instead of retreating","stillness with force behind it"],"unpleasant","high"),
  e("cross-affection-ordinary","cross-sensory",["made coffee for","saved a seat","brought food","fixed it for","covered with blanket"],
    ["small release","orientation toward familiar person"],["care registers through routine"],["affection","belonging"],
    ["accept care","reciprocate later","continue ordinary task"],["home","found family","partnership"],["care disguised as logistics","the ordinary thing carrying the weight"],"pleasant","low"),
  e("cross-jealousy-contained","cross-sensory",["jealous","watched them together","didn't like him touching","didn't like her touching"],
    ["jaw or posture control","attention sticks to rival cue"],["comparison and threat monitoring rise"],["jealousy","insecurity possible"],
    ["go quiet","watch","redirect attention"],["romantic attachment","competition"],["attention refusing to leave the wrong detail","control showing in what did not move"],"mixed","medium"),
  e("cross-disbelief","cross-sensory",["no way","can't be","didn't believe","impossible"],
    ["stillness","blink or orientation reset"],["existing model resists new evidence"],["disbelief","surprise"],
    ["recheck","ask again","look for proof"],["revelation","unexpected return"],["the fact landing twice","mind reaching for the old version"],"mixed","medium"),
  e("cross-horror-recognition","cross-sensory",["horrified","realized what happened","blood everywhere","body on floor"],
    ["cold or heat shift","gut contraction","motor hesitation"],["detail fragments then reconnects"],["horror","shock"],
    ["freeze","orient","act on one concrete task"],["violence","discovery"],["detail arriving before meaning","the room becoming specific in the wrong places"],"unpleasant","high"),
  e("cross-guilt","cross-sensory",["my fault","should have","guilty","if only"],
    ["chest or gut pressure","posture closes"],["counterfactual loops repeat"],["guilt","regret"],
    ["repair","confess","avoid reminder"],["aftermath","responsibility"],["the mind editing a moment already over","responsibility looking for somewhere to go"],"unpleasant","medium"),
  e("cross-protective-focus","cross-sensory",["protect her","protect him","get behind me","stay with me"],
    ["orientation outward","pain/fatigue temporarily deprioritized"],["threat map centers another person"],["protectiveness","resolve"],
    ["position body","direct movement","reduce options"],["danger","care"],["attention leaving the self","body becoming a boundary"],"mixed","high"),
  e("cross-tenderness","cross-sensory",["tender","soft with","gentle with","careful with"],
    ["movement slows","pressure moderates"],["attention sharpens to small responses"],["tenderness","affection"],
    ["adjust touch","wait","observe"],["intimacy","care"],["care measured in millimeters","movement made smaller on purpose"],"pleasant","low"),
  e("cross-vulnerability-chosen","cross-sensory",["told him the truth","told her the truth","let him see","let her see","admitted"],
    ["guard remains present","voice or posture may change"],["risk and choice coexist"],["vulnerability","trust"],
    ["disclose","wait for response","hold boundary"],["developing trust","confession"],["the door opened by hand, not force","exposure with an exit still visible"],"mixed","medium"),
  e("cross-safety-after-choice","cross-sensory",["could leave","door unlocked","didn't stop me","let me go"],
    ["guard may lower after checking exit"],["freedom becomes evidence"],["safety","trust possible"],
    ["stay by choice","test distance","return"],["relationship","recovery"],["staying because leaving remained possible","the exit becoming less urgent once it stayed real"],"pleasant","low"),
  e("cross-relief-after-threat","cross-sensory",["relief","thank god","finally safe","it's okay now"],
    ["muscle release","breath lengthens","weight drops"],["threat monitoring loosens"],["relief","residual alarm possible"],
    ["sit","laugh unexpectedly","reach for someone"],["danger passed","good news"],["the body unclenching late","air coming back into the room"],"pleasant","medium"),
  e("cross-betrayal","cross-sensory",["betrayed","lied to me","you knew","kept it from me"],
    ["stillness","heat or cold shift","distance-seeking"],["past evidence reorganizes"],["hurt","anger","disbelief"],
    ["withdraw","confront","recheck history"],["trust rupture"],["old moments changing shape","distance appearing inside the same room"],"unpleasant","high"),
  e("cross-forgiveness-tentative","cross-sensory",["forgive","trying to forgive","not okay yet","we can try"],
    ["guard softens unevenly"],["harm and future possibility coexist"],["hope","hurt","caution"],
    ["set terms","allow limited closeness","watch follow-through"],["repair"],["a door opened on the chain","hope with conditions"],"mixed","medium"),
  e("cross-homecoming","cross-sensory",["home","back home","came home","our house"],
    ["orientation relaxes toward familiar layout"],["ordinary cues regain salience"],["belonging","grief or relief possible"],
    ["drop belongings","resume ritual","touch familiar object"],["return","recovery"],["the body knowing the room first","familiar clutter doing quiet work"],"mixed","low"),
  e("cross-hypervigilance","cross-sensory",["watching the door","checking exits","every sound","couldn't relax"],
    ["muscle readiness","shallow rest","startle sensitivity"],["attention keeps sampling threat"],["alarm","fatigue"],
    ["scan","position near exit","sleep lightly"],["post-threat","unsafe environment"],["attention with no off switch","every small sound promoted"],"unpleasant","high"),
  e("cross-dissociation","cross-sensory",["far away","not real","outside my body","everything muffled"],
    ["reduced body salience","sensory distance"],["processing fragments or slows"],["numbness","alarm possible"],
    ["stare","move automatically","seek grounding"],["overwhelm","trauma"],["the room one pane farther away","movement without full arrival"],"neutral","low"),
  e("cross-resolve","cross-sensory",["decided","made up my mind","not backing down","enough"],
    ["posture organizes","movement becomes economical"],["options narrow around chosen action"],["resolve","anger or calm possible"],
    ["act","set boundary","prepare"],["decision","conflict"],["uncertainty burning off","movement with less waste"],"mixed","medium"),
  e("cross-hope-fragile","cross-sensory",["hope","maybe this time","could work","want to believe"],
    ["guard and forward energy coexist"],["future possibility competes with remembered risk"],["hope","fear"],
    ["test","wait","prepare carefully"],["recovery","relationship repair"],["hope handled with both hands","future kept small enough to carry"],"mixed","medium"),
  e("cross-pride-quiet","cross-sensory",["proud","did it","pulled it off","made it"],
    ["chest lift","energy steadies"],["effort becomes visible in retrospect"],["pride","relief"],
    ["allow recognition","share result","continue"],["achievement","recovery"],["satisfaction without performance","the work finally allowed to count"],"pleasant","medium"),
  e("cross-embarrassed-affection","cross-sensory",["don't make it weird","shut up","stop looking at me","you're ridiculous"],
    ["face heat","smile suppression","eye contact breaks"],["affection competes with self-consciousness"],["affection","embarrassment"],
    ["deflect","tease","stay close"],["flirtation","found family"],["affection hiding behind complaint","looking away without leaving"],"pleasant","medium"),
  e("cross-protective-anger","cross-sensory",["don't touch her","don't touch him","get away from her","get away from him"],
    ["weight shifts forward","pain deprioritized","voice may flatten"],["threat map centers protected person"],["anger","protectiveness"],
    ["interpose","direct","remove threat"],["danger","care"],["anger given a job","the body choosing where to stand"],"mixed","high"),
  e("cross-grief-functional","cross-sensory",["keep moving","things to do","funeral arrangements","can't stop now"],
    ["fatigue under task focus","automatic movement"],["task sequence suppresses wider processing temporarily"],["grief","duty"],
    ["organize","clean","call","carry"],["bereavement","crisis"],["grief wearing work clothes","the next task holding the edges together"],"unpleasant","medium"),
  e("cross-love-ordinary","cross-sensory",["love you","loved him","loved her","every morning","always made"],
    ["ease around familiar presence","attention to small needs"],["person becomes embedded in routine prediction"],["love","belonging"],
    ["anticipate need","make room","remember preference"],["partnership","family"],["love living in logistics","being known in small repeated ways"],"pleasant","low"),
  e("cross-love-frightened","cross-sensory",["scared to lose","can't lose you","almost lost","thought you were dead"],
    ["grip tightens","breath disruption","proximity seeking"],["attachment and threat fuse temporarily"],["love","fear","relief"],
    ["check body","stay close","repeat contact"],["near loss","reunion"],["love with panic still inside it","contact used as evidence"],"mixed","high"),
  e("movement-exhaustion","movement",["exhausted","legs heavy","could barely stand","worn out"],
    ["reduced force","slower transitions","postural effort rises"],["effort cost becomes salient"],["fatigue","frustration possible"],
    ["sit","brace","shorten task"],["recovery","overexertion"],["gravity getting expensive","every transition requiring negotiation"],"unpleasant","low"),
  e("touch-reassurance-check","touch",["checked her pulse","hand on shoulder","squeezed his hand","squeezed her hand"],
    ["attention localizes to contact","pressure calibrates to response"],["contact supplies information"],["care","alarm or relief"],
    ["check","wait for response","adjust"],["injury","reassurance"],["touch asking a question","pressure waiting for an answer"],"mixed","medium"),
  e("sound-silence-after-conflict","sound",["went quiet","silence after","nobody spoke","room was quiet"],
    ["hearing sharpens to incidental noise"],["unsaid material becomes salient"],["tension","hurt","uncertainty"],
    ["wait","avoid eye contact","resume small task"],["argument","rupture"],["small sounds suddenly too clear","silence carrying unfinished business"],"mixed","medium"),
  e("smell-familiar-person","smell",["smelled like him","smelled like her","his shirt","her shirt"],
    ["orientation and memory link quickly"],["person-memory becomes immediate"],["longing","comfort","grief possible"],
    ["linger","hold fabric","move closer"],["absence","intimacy"],["recognition before naming","memory arriving through the nose"],"mixed","medium"),
  e("temperature-cold-stress","temperature",["freezing","cold hands","shivering","couldn't get warm"],
    ["vasoconstriction","tremor","fine movement worsens"],["warmth becomes task priority"],["discomfort","alarm possible"],
    ["layer","seek heat","curl inward"],["winter","shock","exposure"],["cold getting into the joints","hands losing precision"],"unpleasant","medium"),
  e("taste-nausea","taste",["metal taste","bile","nauseous","mouth watered"],
    ["salivation change","stomach contraction","swallowing changes"],["food and smell salience shifts"],["disgust","alarm possible"],
    ["stop eating","breathe","seek water"],["illness","stress"],["mouth preparing before the mind catches up","taste turning warning"],"unpleasant","medium"),

  e("interoception-dehydration","interoception",["thirsty","dry mouth","need water","dehydrated"],
    ["dry mouth","head pressure possible","lower stamina"],["water salience rises"],["irritability possible","need"],
    ["seek water","slow effort"],["heat","illness","ordinary life"],["mouth gone tacky","water becoming the next useful thought"],"unpleasant","low"),
  e("interoception-sleep-debt","interoception",["exhausted","didn't sleep","up all night","sleep deprived"],
    ["heavy eyes","slower coordination","muscle fatigue"],["attention slips","working memory thins"],["irritability possible","flatness"],
    ["simplify task","miss cues","seek rest"],["insomnia","caregiving","stress"],["thought arriving half a beat late","body moving through syrup"],"unpleasant","low"),
  e("interoception-overfull","interoception",["too full","stuffed","ate too much","uncomfortably full"],
    ["abdominal pressure","movement feels compressed"],["food salience drops"],["discomfort"],
    ["loosen posture","move slowly","avoid more food"],["meal","ordinary life"],["breath negotiating for room","movement shortened around the stomach"],"unpleasant","low"),
  e("cross-bored-restless","cross-sensory",["bored","restless","nothing to do","can't sit still"],
    ["small repetitive movement","low-grade activation"],["attention hunts novelty"],["restlessness","irritation possible"],
    ["pace","switch tasks","seek stimulation"],["waiting","ordinary life"],["energy with nowhere useful to land","attention picking at the room"],"neutral","low"),
  e("cross-social-ease","cross-sensory",["easy with him","easy with her","comfortable together","didn't have to talk"],
    ["less self-monitoring","natural posture"],["attention can leave self-presentation"],["ease","belonging"],
    ["share space","do separate tasks nearby"],["friendship","partnership"],["company without performance","silence not asking for repair"],"pleasant","low"),
  e("cross-uncertainty-held","cross-sensory",["don't know yet","not sure","maybe","wait and see"],
    ["guard remains moderate","movement pauses"],["multiple models stay active"],["uncertainty","curiosity possible"],
    ["delay decision","gather evidence","ask"],["ambiguity","investigation"],["not choosing before the facts arrive","room left around the answer"],"neutral","medium"),
  e("cross-joy-sudden","cross-sensory",["laughed","couldn't stop smiling","good news","we did it"],
    ["face and chest lift","energy rises"],["attention broadens"],["joy","relief possible"],
    ["laugh","reach","move faster"],["success","reunion","surprise"],["joy arriving faster than composure","the body getting there first"],"pleasant","high"),
  e("cross-awe-threat-mixed","cross-sensory",["beautiful and terrifying","couldn't look away","too big","awe and fear"],
    ["stillness with elevated activation","breath change"],["scale dominates attention"],["awe","fear"],
    ["watch","hold distance","approach cautiously"],["nature","violence aftermath","discovery"],["wonder with teeth","beauty refusing to become safety"],"mixed","high"),
  e("movement-stiffness","movement",["stiff","sore","hard to get up","tight muscles"],
    ["reduced range","slow first movement","compensatory posture"],["movement planning becomes explicit"],["annoyance possible","caution"],
    ["stretch","brace","warm up"],["morning","recovery","chronic pain"],["the first movement costing the most","joints needing negotiation"],"unpleasant","low"),
  e("touch-aftercare","touch",["cleaned the wound","brought ice","fixed the blanket","helped with bandage"],
    ["contact calibrated around pain","guard may lower"],["care registers through precision"],["care","trust possible"],
    ["accept help","correct pressure","rest"],["injury","intimacy","recovery"],["care made practical","attention measured in pressure and placement"],"pleasant","low"),
  e("cross-shame-exposure","cross-sensory",["ashamed","humiliated","wanted to disappear","mortified"],
    ["face heat or cold","posture contracts","eye contact becomes effort"],["self-monitoring spikes","social risk dominates"],["shame","hurt"],["hide","deflect","repair image","leave"],["public mistake","intimacy rupture","status threat"],["visibility turning painful","the room suddenly having too many witnesses"],"unpleasant","high"),
  e("cross-anger-contained","cross-sensory",["angry but calm","voice went flat","too angry to yell","held still"],
    ["jaw or hands organize","movement becomes economical"],["attention narrows to boundary or target"],["anger","control"],["speak less","set terms","move with precision"],["conflict","protective action"],["anger made quiet enough to aim","stillness carrying force"],"mixed","high"),
  e("cross-resentment","cross-sensory",["resented","still mad about","never forgot","kept score"],
    ["low-grade tension","attention catches old imbalance"],["past injury re-enters present interpretation"],["resentment","hurt"],["withhold","correct","distance","test reciprocity"],["long relationship","unrepaired rupture"],["an old bruise pressed by a new hand","history entering before the sentence finishes"],"unpleasant","medium"),
  e("cross-loneliness","cross-sensory",["lonely","alone tonight","missed having someone","empty apartment"],
    ["space feels larger","movement may slow"],["absence becomes salient through routine"],["loneliness","longing"],["reach out","stay busy","linger around familiar traces"],["absence","night","transition"],["the room keeping too much of its own sound","routine with one person missing"],"unpleasant","low"),
  e("cross-panic-surge","cross-sensory",["panic","can't breathe","heart racing","need out now"],
    ["rapid breath","heart-rate surge","fine control worsens"],["threat interpretation accelerates"],["panic","fear"],["escape","brace","seek concrete anchor"],["acute overwhelm","trigger"],["the body outrunning the explanation","every exit becoming urgent at once"],"unpleasant","high"),
  e("cross-post-adrenaline-crash","cross-sensory",["shaking after","adrenaline wore off","after the fight","after the scare"],
    ["tremor","weakness","temperature shift","fatigue"],["processing catches up after action"],["relief","shock","exhaustion"],["sit","drink","check injuries","laugh or cry unexpectedly"],["aftermath","danger passed"],["the bill arriving after the body already paid","strength leaving once it was allowed to"],"mixed","medium"),
  e("cross-disgust-moral","cross-sensory",["disgusted by him","disgusted by her","made me sick","revolting"],
    ["recoil","mouth or stomach tightens"],["distance and rejection sharpen"],["disgust","anger"],["move away","refuse contact","reject frame"],["betrayal","cruelty","violation"],["distance becoming physical before it became polite","the body voting no"],"unpleasant","medium"),
  e("cross-compassion","cross-sensory",["felt sorry for","could see it hurt","wanted to help","gentled"],
    ["movement slows","attention settles on another person's cues"],["other person's need becomes salient without erasing boundaries"],["compassion","care"],["offer help","wait","reduce pressure"],["caregiving","repair","stranger distress"],["attention making room without taking over","care arriving as an offer"],"pleasant","low"),
  e("cross-desire-held","cross-sensory",["wanted him","wanted her","wanted to touch","wanted closer"],
    ["proximity salience","breath or temperature may change"],["attention returns to contact possibilities"],["desire","anticipation"],["approach","wait","ask","hold position"],["consensual intimacy","flirtation"],["want with the brakes still attached","attention measuring distance"],"pleasant","medium"),
  e("cross-desire-conflicted","cross-sensory",["wanted to but","wanted him and hated","wanted her and feared","body said yes"],
    ["approach and bracing coexist"],["competing predictions remain active"],["desire","fear","anger or grief possible"],["pause","set condition","move closer then stop"],["complex intimacy","trauma history"],["want and warning occupying the same inch","the body refusing a simple answer"],"mixed","high"),
  e("interoception-fever-illness","interoception",["fever","sick","chills","aching all over"],
    ["temperature instability","aches","slower movement"],["attention and working memory narrow"],["irritability","vulnerability"],["rest","seek fluids","reduce task"],["illness","recovery"],["skin unable to pick a season","thought moving on reduced power"],"unpleasant","low"),
  e("interoception-pain-flare","interoception",["pain flared","nerve pain","sharp pain","burning pain"],
    ["guarding","range reduces","breath changes around movement"],["movement planning becomes explicit"],["frustration","alarm possible"],["brace","reroute movement","protect area"],["injury","chronic pain","recovery"],["the route through the room changing around pain","motion renegotiated mid-step"],"unpleasant","high"),
  e("cross-sensory-overload","cross-sensory",["too loud","too bright","too much","everything at once"],
    ["muscle tension","startle sensitivity","head or skin discomfort"],["filtering fails and details compete equally"],["overwhelm","irritation"],["reduce input","cover ears","leave","narrow task"],["crowd","stress","fatigue"],["every signal promoted to urgent","the room refusing a background"],"unpleasant","high"),
  e("cross-focus-absorbed","cross-sensory",["lost track of time","absorbed","in the zone","focused"],
    ["incidental body cues recede"],["task representation dominates"],["engagement","satisfaction possible"],["continue","miss peripheral cues","delay interruption"],["work","craft","investigation"],["the room falling to the edges","attention spending itself on one thing"],"pleasant","medium"),
  e("cross-frustration-ordinary","cross-sensory",["annoyed","frustrated","stupid thing","won't work"],
    ["small tension","repeated movement"],["obstacle becomes disproportionately salient"],["frustration"],["retry","swear","change method","walk away briefly"],["ordinary task","technology","repair"],["irritation looking for a handle","the third attempt becoming personal"],"unpleasant","medium"),
  e("cross-joy-quiet","cross-sensory",["quietly happy","content","this is nice","good like this"],
    ["muscle tone eases","breath settles"],["attention can stay with ordinary detail"],["contentment","joy"],["linger","continue routine","share space"],["domestic life","recovery","belonging"],["nothing demanding improvement","the ordinary moment allowed to be enough"],"pleasant","low"),
  e("cross-grief-trigger-memory","cross-sensory",["reminded me of","smelled like them","their song","used to do that"],
    ["brief breath or posture change","attention catches"],["past scene overlays present cue"],["grief","love","nostalgia"],["pause","touch object","continue with residue"],["bereavement","anniversary","ordinary trigger"],["the past arriving through a side door","memory catching on an ordinary thing"],"mixed","medium"),
  e("touch-boundary-repair","touch",["asked before touching","can i touch you","waited for permission","pulled back when"],
    ["guard can recalibrate"],["choice becomes part of the contact evidence"],["caution","trust possible"],["accept","decline","set placement or pressure"],["repair","trauma-aware care","intimacy"],["permission changing the shape of contact","trust built in the pause before touch"],"pleasant","low"),
  e("cross-startle-recovery","cross-sensory",["jumped then laughed","startled","false alarm","just the door"],
    ["startle surge then release"],["source reclassified from threat"],["surprise","relief"],["exhale","laugh","resume"],["unexpected noise","safe environment"],["alarm leaving faster than it arrived","the body correcting itself a beat late"],"mixed","medium"),


];

export type FeltLifeAtlasAudit={entryCount:number;duplicateIds:string[];invalidEntries:string[];valences:FeltValence[];activations:FeltActivation[]};
export function auditFeltLifeAtlas(entries:readonly FeltLifeEntry[]=FELT_LIFE_ATLAS):FeltLifeAtlasAudit{
 const ids=new Set<string>();const duplicateIds:string[]=[];const invalidEntries:string[]=[];
 for(const entry of entries){
  if(ids.has(entry.id))duplicateIds.push(entry.id);ids.add(entry.id);
  if(!entry.id.trim()||!entry.cues.length||!entry.bodyEffect.length||!entry.behavior.length||!entry.language.length||entry.confidenceCeiling<=0||entry.confidenceCeiling>=1)invalidEntries.push(entry.id||"<missing>");
 }
 return{entryCount:entries.length,duplicateIds:[...new Set(duplicateIds)],invalidEntries:[...new Set(invalidEntries)],valences:[...new Set(entries.map(x=>x.valence))],activations:[...new Set(entries.map(x=>x.activation))]};
}
export function assertFeltLifeAtlasIntegrity(entries:readonly FeltLifeEntry[]=FELT_LIFE_ATLAS):void{
 const report=auditFeltLifeAtlas(entries);
 if(report.duplicateIds.length)throw new Error("felt_life_duplicate_ids:"+report.duplicateIds.join(","));
 if(report.invalidEntries.length)throw new Error("felt_life_invalid_entries:"+report.invalidEntries.join(","));
}

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
