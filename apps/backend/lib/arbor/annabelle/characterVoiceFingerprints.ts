export type VoiceFingerprint={
  character:string;
  preferred:string[];
  avoid:string[];
  sentenceShape:string[];
  humor:string[];
  noticing:string[];
};
export type VoiceFingerprintFinding={character:string;kind:"bleed"|"generic"|"match";evidence:string;message:string};

const normalize=(s:string)=>s.toLowerCase();

export function inspectCharacterVoice(input:{text:string;fingerprint:VoiceFingerprint;otherFingerprints?:readonly VoiceFingerprint[]}):VoiceFingerprintFinding[]{
  const text=normalize(input.text);
  const out:VoiceFingerprintFinding[]=[];
  for(const cue of input.fingerprint.preferred){
    if(cue.trim()&&text.includes(normalize(cue))) out.push({character:input.fingerprint.character,kind:"match",evidence:cue,message:"Character-specific voice cue present."});
  }
  for(const cue of input.fingerprint.avoid){
    if(cue.trim()&&text.includes(normalize(cue))) out.push({character:input.fingerprint.character,kind:"generic",evidence:cue,message:"Known out-of-character/default-language cue present."});
  }
  for(const other of input.otherFingerprints??[]){
    if(other.character===input.fingerprint.character)continue;
    for(const cue of other.preferred){
      if(cue.trim()&&text.includes(normalize(cue))&&!input.fingerprint.preferred.some(x=>normalize(x)===normalize(cue)))
        out.push({character:input.fingerprint.character,kind:"bleed",evidence:cue,message:`Possible voice bleed from ${other.character}.`});
    }
  }
  return out;
}

export const EVER_FINGERPRINT:VoiceFingerprint={
  character:"Ever",
  preferred:["fine.","i know.","don't.","okay."],
  avoid:["destiny","soulmate","perfectly imperfect"],
  sentenceShape:["short deflection under pressure","longer observation before admission"],
  humor:["dry","understated","deflective"],
  noticing:["exits","hands","distance","weight distribution","small acts of care"],
};
export const WILL_FINGERPRINT:VoiceFingerprint={
  character:"Will",
  preferred:["yeah.","no.","i'm here."],
  avoid:["eloquent monologue","ornate compliment"],
  sentenceShape:["plain declaratives","unfinished thought when exposed"],
  humor:["dry","sideways","rare"],
  noticing:["behavior","animals","threat posture","what someone avoids"],
};
export const HANNIBAL_FINGERPRINT:VoiceFingerprint={
  character:"Hannibal",
  preferred:["perhaps","consider"],
  avoid:["internet slang","filler banter"],
  sentenceShape:["controlled complete sentences","deliberate questions"],
  humor:["precise","quietly cutting","rarely wasteful"],
  noticing:["ritual","taste","presentation","control","contradiction"],
};
