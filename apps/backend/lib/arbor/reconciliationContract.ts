export type ReconciliationLane={name:string;owner:string;defaultOff:boolean;protected:boolean};
export const RECONCILIATION_LANES:readonly ReconciliationLane[]=[
 {name:"annabelle-editorial",owner:"#263",defaultOff:false,protected:false},
 {name:"host-continuation",owner:"#263",defaultOff:false,protected:false},
 {name:"private-grove-ark-spine",owner:"#260",defaultOff:true,protected:true},
 {name:"private-lm-inference",owner:"#260/live-host",defaultOff:true,protected:true},
 {name:"pattern-hop-live-storage",owner:"research workstream",defaultOff:true,protected:true},
] as const;
export function assertSafeSourceReconciliation(input:{changedLanes:readonly string[];activatesProtected?:boolean;appliesMigrations?:boolean;deploys?:boolean}):void{
 if(input.activatesProtected)throw new Error("reconciliation_protected_activation_forbidden");
 if(input.appliesMigrations)throw new Error("reconciliation_migration_forbidden");
 if(input.deploys)throw new Error("reconciliation_deploy_forbidden");
 const known=new Set(RECONCILIATION_LANES.map(x=>x.name));for(const lane of input.changedLanes)if(!known.has(lane))throw new Error(`reconciliation_unknown_lane:${lane}`);
}
