export type SupportingCharacterEvidence={name:string;role:string;voiceEvidence:string[];relationshipEvidence:string[];status:"evidence-backed"|"needs-canonical-evidence"};
export const EVER_AFTER_SUPPORTING_CHARACTERS:readonly SupportingCharacterEvidence[]=[
 {name:"Mara",role:"supporting cast",voiceEvidence:[],relationshipEvidence:[],status:"needs-canonical-evidence"},
 {name:"Priya",role:"supporting cast",voiceEvidence:[],relationshipEvidence:[],status:"needs-canonical-evidence"},
 {name:"Kevin",role:"supporting cast",voiceEvidence:[],relationshipEvidence:[],status:"needs-canonical-evidence"},
 {name:"Dr. Bennett",role:"supporting cast",voiceEvidence:[],relationshipEvidence:[],status:"needs-canonical-evidence"},
 {name:"Hank",role:"supporting cast",voiceEvidence:[],relationshipEvidence:[],status:"needs-canonical-evidence"},
 {name:"Leo",role:"supporting cast",voiceEvidence:[],relationshipEvidence:[],status:"needs-canonical-evidence"},
 {name:"Lena",role:"supporting cast",voiceEvidence:[],relationshipEvidence:[],status:"needs-canonical-evidence"},
 {name:"Charles Mercer",role:"supporting cast",voiceEvidence:[],relationshipEvidence:[],status:"needs-canonical-evidence"},
];
export function supportingCharacter(name:string){return EVER_AFTER_SUPPORTING_CHARACTERS.find(x=>x.name===name);}
