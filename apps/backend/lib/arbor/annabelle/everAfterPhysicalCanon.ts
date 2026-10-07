export type PersistentPhysicalCanon={
 character:string;
 traits:string[];
 injuries:string[];
 scars:string[];
 movement:string[];
};
export const EVER_PHYSICAL_CANON:PersistentPhysicalCanon={
 character:"Ever",
 traits:["petite athletic build","long red hair","green eyes","faint freckles"],
 injuries:["right hip/leg damage"],
 scars:["burn scars","shoulder scar"],
 movement:["hip hitch","movement may compensate around right hip/leg"],
};
export function missingPhysicalCanon(observed:readonly string[],canon:PersistentPhysicalCanon=EVER_PHYSICAL_CANON):string[]{
 const normalized=new Set(observed.map(x=>x.toLowerCase()));
 return[...canon.injuries,...canon.scars,...canon.movement].filter(x=>!normalized.has(x.toLowerCase()));
}
