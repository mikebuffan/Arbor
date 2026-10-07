import type {ArkTaskStatus} from "./types";
const TERMINAL=new Set<ArkTaskStatus>(["completed","failed","cancelled"]);
export function arkTaskReadbackFlags(status:string){
 const completed=status==="completed";
 return{terminal:TERMINAL.has(status as ArkTaskStatus),completed};
}
