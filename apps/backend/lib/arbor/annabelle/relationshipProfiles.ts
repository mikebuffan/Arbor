export type RelationshipProfile={
 pair:string;
 core:string[];
 mustEarn:string[];
 forbiddenShortcuts:string[];
};
export const EVER_WILL:RelationshipProfile={pair:"Ever/Will",core:["primary attachment","practical care","earned trust","choice"],mustEarn:["disclosure","increased touch","repair after rupture","future planning"],forbiddenShortcuts:["instant mind-reading","conflict erased by sex","trust increase without evidence"]};
export const EVER_HANNIBAL:RelationshipProfile={pair:"Ever/Hannibal",core:["later relationship complexity","precision","power awareness","choice must remain explicit"],mustEarn:["trust","access","intimacy","vulnerability"],forbiddenShortcuts:["body response equals consent","power difference ignored","instant domestic ease"]};
export const EVER_RHYS:RelationshipProfile={pair:"Ever/Rhys",core:["captor dynamic","threat","coercion","survival"],mustEarn:[],forbiddenShortcuts:["coercion reframed as consent","trauma response reframed as desire","captivity treated as relationship trust"]};
export function relationshipProfile(pair:string):RelationshipProfile|undefined{return[EVER_WILL,EVER_HANNIBAL,EVER_RHYS].find(x=>x.pair===pair);}
