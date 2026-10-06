import {afterEach,expect,it,vi} from "vitest";
afterEach(()=>vi.unstubAllEnvs());
it("imports the independent read path without OpenAI credentials or provider initialization",async()=>{
 vi.stubEnv("OPENAI_API_KEY", "");
 vi.resetModules();
 const recall=await import("@/lib/memory/readRecall");
 const corrections=await import("@/lib/arbor/runtime/correctionPromotion");
 expect(typeof recall.readArborMemoryRecall).toBe("function");
 expect(typeof corrections.loadDurableBehaviorCorrections).toBe("function");
});
