export type RoundaboutSignal={
  kind:"contradiction"|"low-independence"|"alias-unresolved"|"timeline-gap"|"relationship-gap"|"dead-end";
  evidenceIds:string[];
  detail:string;
};
export type HopDirective={route:"investigate"|"hold"|"reroute"|"accept";reason:string;preserveEvidenceIds:string[]};

export function routeRoundaboutSignal(signal:RoundaboutSignal):HopDirective{
  switch(signal.kind){
    case"contradiction":return{route:"investigate",reason:"Contradiction requires investigation; do not flatten it.",preserveEvidenceIds:signal.evidenceIds};
    case"low-independence":return{route:"hold",reason:"Repeated reporting is not independent corroboration.",preserveEvidenceIds:signal.evidenceIds};
    case"alias-unresolved":return{route:"hold",reason:"Identity resolution is unresolved; never silently merge.",preserveEvidenceIds:signal.evidenceIds};
    case"timeline-gap":case"relationship-gap":return{route:"investigate",reason:"Gap creates a bounded evidence hop.",preserveEvidenceIds:signal.evidenceIds};
    case"dead-end":return{route:"reroute",reason:"Failed lead reroutes within bounded branching.",preserveEvidenceIds:signal.evidenceIds};
  }
}
