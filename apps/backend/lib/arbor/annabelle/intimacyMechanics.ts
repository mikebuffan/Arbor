export type IntimacyBeat={
 relationship:string;
 stage:string;
 initiation:string;
 choiceEvidence:string[];
 bodyResponses:string[];
 verbalEvidence:string[];
 corrections:string[];
 aftermath:string[];
};
export type IntimacyIssue={kind:"choice-missing"|"body-equals-consent"|"stage-jump"|"aftermath-missing";message:string};

export function inspectIntimacyBeat(beat:IntimacyBeat):IntimacyIssue[]{
 const out:IntimacyIssue[]=[];
 const hasChoice=beat.choiceEvidence.length>0||beat.verbalEvidence.length>0;
 if(!hasChoice)out.push({kind:"choice-missing",message:"Intimacy beat lacks visible choice/permission evidence."});
 if(!hasChoice&&beat.bodyResponses.length>0)out.push({kind:"body-equals-consent",message:"Body response cannot establish consent or relationship permission."});
 if(/early|tentative/i.test(beat.stage)&&/ownership|forever|no boundaries/i.test(beat.initiation))
  out.push({kind:"stage-jump",message:"Intimacy language may outrun the recorded relationship stage."});
 if(beat.aftermath.length===0)out.push({kind:"aftermath-missing",message:"Intimacy beat has no physical/emotional/relational residue; verify whether compression is intentional."});
 return out;
}
