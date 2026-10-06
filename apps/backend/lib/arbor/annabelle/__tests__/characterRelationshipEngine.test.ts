import {describe,expect,it} from "vitest";
import {checkCharacterRelationshipIntegrity} from "../characterRelationshipEngine";
describe("character relationship integrity",()=>{it("flags unearned state changes",()=>{
 const issues=checkCharacterRelationshipIntegrity({characters:[
  {name:"Ever",chapter:2,knowledge:[],injuries:["hip"],boundaries:["no surprise touch"],speechTraits:[],noticing:[]},
  {name:"Ever",chapter:3,knowledge:[],injuries:[],boundaries:[],speechTraits:[],noticing:[]}],
 relationships:[
  {pair:"Ever/Will",chapter:2,stage:"early",trust:2,allowedTouch:[],disclosures:[],ruptures:[],repairs:[]},
  {pair:"Ever/Will",chapter:3,stage:"early",trust:5,allowedTouch:[],disclosures:[],ruptures:[],repairs:[]}]});
 expect(issues.map(x=>x.kind)).toContain("injury-drop");
 expect(issues.map(x=>x.kind)).toContain("boundary-drift");
 expect(issues.map(x=>x.kind)).toContain("relationship-regression");
});});