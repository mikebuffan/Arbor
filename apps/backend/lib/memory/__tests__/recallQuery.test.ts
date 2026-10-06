import {describe,expect,it} from "vitest";
import {memoryRecallQuery} from "../recallQuery";
describe("saved-goal retrieval orientation",()=>{
  it.each(["Okay","Sounds good","Where were we?"])("uses the saved goal for %s",text=>{
    expect(memoryRecallQuery(text,"Finish One Arbor memory integration")).toBe(`Finish One Arbor memory integration\n${text}`);
  });
  it("uses an explicit new topic without pulling in the old goal",()=>{
    expect(memoryRecallQuery("Help me with chapter one","Finish memory integration")).toBe("Help me with chapter one");
  });
  it("does not invent a goal for short replies",()=>{
    expect(memoryRecallQuery("Okay",null)).toBe("Okay");
  });
});
