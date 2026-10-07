import{describe,expect,it}from"vitest";
import{ANNABELLE_ENGINE_CATALOG}from"../engineCatalog";
import{auditFeltLifeAtlas,inferFeltLife}from"../../feltLife/atlas";
import{ANNABELLE_GOLD_EXEMPLAR_CANDIDATES,validatedGoldExemplars}from"../goldExemplarCatalog";

const required=[
 "voice-core","felt-life-atlas","character-integrity","relationship-stage","movement-mechanics",
 "sensory-expansion","atmosphere-expansion","humor","dialogue-naturalism","power-response",
 "repetition-intent","motif-payoff","raw-gravity","camera","discovery-density",
 "explanation-redundancy","rhythm","internal-clock","object-environment","scene-change",
 "screen-time-balance","downstream-impact","canon-timeline-knowledge","gold-do-not-touch",
 "book-self-check"
];

describe("Annabelle finish-line contract",()=>{
 it("has executable coverage for every requested engine lane",()=>{
  const byId=new Map(ANNABELLE_ENGINE_CATALOG.map(x=>[x.id,x]));
  for(const id of required)expect(byId.get(id)?.status,id).toBe("implemented");
 });
 it("keeps Felt-Life non-verdict with a unique expanded atlas",()=>{
  const audit=auditFeltLifeAtlas();
  expect(audit.entryCount).toBeGreaterThanOrEqual(90);
  expect(audit.duplicateIds).toEqual([]);
  expect(inferFeltLife({text:"She froze when the door slammed."}).guard).toBe("hypothesis-not-verdict");
 });
 it("does not pretend candidate Gold prose has been human-validated",()=>{
  expect(ANNABELLE_GOLD_EXEMPLAR_CANDIDATES.length).toBeGreaterThan(0);
  expect(validatedGoldExemplars(ANNABELLE_GOLD_EXEMPLAR_CANDIDATES)).toEqual([]);
 });
});