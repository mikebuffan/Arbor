export type CharacterBehaviorProfile={
 name:string;
 speech:string[];
 noticing:string[];
 stressBehavior:string[];
 careBehavior:string[];
 humor:string[];
 prohibitedShortcuts:string[];
};
export const EVER_BEHAVIOR:CharacterBehaviorProfile={
 name:"Ever",speech:["restrained","adult","minimal profanity","deflection before disclosure"],noticing:["distance","hands","exits","body mechanics","small care"],stressBehavior:["go still","control movement","protect boundary","act before explaining"],careBehavior:["practical help","attention to small needs","choice-preserving touch"],humor:["dry","understated","deflective"],prohibitedShortcuts:["generic helplessness","instant emotional exposition"],
};
export const WILL_BEHAVIOR:CharacterBehaviorProfile={
 name:"Will",speech:["plain","masculine","unfinished under exposure"],noticing:["behavior","animals","threat posture","avoidance"],stressBehavior:["watch","withdraw","interpose when protective"],careBehavior:["show up","do the task","stay nearby"],humor:["dry","sideways","rare"],prohibitedShortcuts:["perfect therapist speech","ornate romantic monologue"],
};
export const HANNIBAL_BEHAVIOR:CharacterBehaviorProfile={
 name:"Hannibal",speech:["controlled","precise","deliberate"],noticing:["ritual","taste","presentation","contradiction","control"],stressBehavior:["become more controlled","redirect pressure","act with precision"],careBehavior:["anticipate","prepare","control environment"],humor:["precise","quietly cutting"],prohibitedShortcuts:["internet slang","filler banter"],
};
export function behaviorProfile(name:string):CharacterBehaviorProfile|undefined{return[EVER_BEHAVIOR,WILL_BEHAVIOR,HANNIBAL_BEHAVIOR].find(x=>x.name===name);}
