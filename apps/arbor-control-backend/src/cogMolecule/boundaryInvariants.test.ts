import {describe,expect,it,vi} from "vitest";
import {ArborCapabilityRegistry} from "../capabilities.js";
import type {ArborState} from "../types.js";
import {carrierStateToPacket,applyMoleculeResultToCarrier} from "./carrierAdapter.js";
import {executeMoleculeCapability} from "./capabilityAdapter.js";

const state=(activeSubsystem:"arbor"|"annabelle"="annabelle"):ArborState=>({activeSubsystem,goal:"keep boundary",unresolvedWork:[],strategyNotes:[],behavioralCorrections:[],acousticCorrections:[],voiceId:"test",selfModel:{version:"identity-v1",checksum:"c",sourceDigest:"d",sourceQuestionCount:1,promotedPatternIds:[],initializedAt:"2026-01-01T00:00:00Z",verifiedAt:"2026-01-01T00:00:00Z"}});

describe("molecule host boundaries",()=>{
 it("cannot rewrite active subsystem or identity root through carrier results",()=>{const original=state();const packet=carrierStateToPacket(original,"p","reason");packet.metadata.activeSubsystem="arbor";packet.metadata.selfModelVersion="evil";const next=applyMoleculeResultToCarrier(original,{disposition:"assert",packet:{...packet,unresolved:[]},rounds:1,reasons:[],computeSpent:1});expect(next.activeSubsystem).toBe("annabelle");expect(next.selfModel).toEqual(original.selfModel);});
 it("requires explicit authorization before high-consequence capability execution",async()=>{const execute=vi.fn(async()=>({result:"ran"}));const registry=new ArborCapabilityRegistry().register({name:"dangerous",description:"boundary test",parameters:{type:"object"},risk:"high_consequence",execute});const context={turnId:"t",state:state("arbor")};await expect(executeMoleculeCapability(registry,"dangerous",{},context,false)).rejects.toThrow("molecule_user_boundary_required:dangerous:high_consequence");expect(execute).not.toHaveBeenCalled();await expect(executeMoleculeCapability(registry,"dangerous",{},context,true)).resolves.toEqual({result:"ran"});expect(execute).toHaveBeenCalledTimes(1);});
});
