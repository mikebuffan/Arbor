import {describe,expect,it} from "vitest";
import {hasExplicitDurableAuthorization,requiresDurableAuthorization} from "@/lib/memory/durableAuthorization";
describe("durable authorization",()=>{
 it("recognizes explicit permanence",()=>{
  expect(hasExplicitDurableAuthorization("New hard rule: do not learn this automatically")).toBe(true);
  expect(hasExplicitDurableAuthorization("Remember this from now on")).toBe(true);
  expect(hasExplicitDurableAuthorization("Never call me dude")).toBe(true);
 });
 it("does not infer permanence from ordinary context",()=>{
  expect(hasExplicitDurableAuthorization("I was annoyed yesterday")).toBe(false);
  expect(hasExplicitDurableAuthorization("This seems important")).toBe(false);
 });
 it("marks global/core/pinned behavior as durable",()=>{
  expect(requiresDurableAuthorization({scope:"global"})).toBe(true);
  expect(requiresDurableAuthorization({tier:"core"})).toBe(true);
  expect(requiresDurableAuthorization({pinned:true})).toBe(true);
  expect(requiresDurableAuthorization({scope:"conversation",tier:"normal"})).toBe(false);
 });
});
