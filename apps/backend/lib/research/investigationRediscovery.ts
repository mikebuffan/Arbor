export type InvestigationRediscoveryRoute = {
  routeId: string;
  startAnchor: string;
  targetKey: string;
  evidenceRefs: string[];
  lineageKeys: string[];
  entityPath: string[];
  retrievalMethods: string[];
};

export type InvestigationRediscoveryResult = {
  targetKey: string;
  status:
    | "single_route"
    | "multi_route_shared_lineage"
    | "independently_rediscovered";
  qualifyingRouteIds: string[];
  disqualifiedRouteIds: string[];
  distinctStartAnchors: string[];
  independentLineages: string[];
  note:
    "Independent rediscovery strengthens a lead, but does not establish conduct or promote a finding.";
};

function text(value: unknown, field: string, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("investigation_rediscovery_invalid_" + field);
  }
  return value.trim();
}

function strings(
  value: unknown,
  field: string,
  minItems = 1,
  maxItems = 100,
): string[] {
  if (!Array.isArray(value) ||
      value.length < minItems ||
      value.length > maxItems) {
    throw new Error("investigation_rediscovery_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 1000));
  if (new Set(out).size !== out.length) {
    throw new Error("investigation_rediscovery_duplicate_" + field);
  }
  return out;
}

function validateRoute(
  route: InvestigationRediscoveryRoute,
): InvestigationRediscoveryRoute {
  return {
    routeId: text(route.routeId, "route_id", 300),
    startAnchor: text(route.startAnchor, "start_anchor", 1000),
    targetKey: text(route.targetKey, "target_key", 1000),
    evidenceRefs: strings(route.evidenceRefs, "evidence_refs"),
    lineageKeys: strings(route.lineageKeys, "lineage_keys"),
    entityPath: strings(route.entityPath, "entity_path"),
    retrievalMethods: strings(
      route.retrievalMethods,
      "retrieval_methods",
      1,
      20,
    ),
  };
}

function shareAny(a: string[], b: string[]): boolean {
  const set = new Set(a);
  return b.some((value) => set.has(value));
}

function routeIsIndependent(
  candidate: InvestigationRediscoveryRoute,
  accepted: InvestigationRediscoveryRoute[],
): boolean {
  return accepted.every((other) => {
    if (candidate.startAnchor === other.startAnchor) return false;
    if (shareAny(candidate.lineageKeys, other.lineageKeys)) return false;
    if (shareAny(candidate.evidenceRefs, other.evidenceRefs)) return false;
    return true;
  });
}

export function evaluateIndependentRediscovery(input: {
  targetKey: string;
  routes: InvestigationRediscoveryRoute[];
}): InvestigationRediscoveryResult {
  const targetKey = text(input.targetKey, "target_key", 1000);
  if (!Array.isArray(input.routes) ||
      input.routes.length < 1 ||
      input.routes.length > 50) {
    throw new Error("investigation_rediscovery_invalid_routes");
  }

  const routes = input.routes.map(validateRoute);
  if (new Set(routes.map((route) => route.routeId)).size !== routes.length) {
    throw new Error("investigation_rediscovery_duplicate_route_id");
  }
  if (routes.some((route) => route.targetKey !== targetKey)) {
    throw new Error("investigation_rediscovery_target_mismatch");
  }

  const accepted: InvestigationRediscoveryRoute[] = [];
  const disqualified: InvestigationRediscoveryRoute[] = [];

  for (const route of routes) {
    if (accepted.length === 0 || routeIsIndependent(route, accepted)) {
      accepted.push(route);
    } else {
      disqualified.push(route);
    }
  }

  const distinctStartAnchors = [
    ...new Set(routes.map((route) => route.startAnchor)),
  ].sort();
  const independentLineages = [
    ...new Set(accepted.flatMap((route) => route.lineageKeys)),
  ].sort();

  let status: InvestigationRediscoveryResult["status"];
  if (routes.length === 1 || distinctStartAnchors.length === 1) {
    status = "single_route";
  } else if (accepted.length >= 2) {
    status = "independently_rediscovered";
  } else {
    status = "multi_route_shared_lineage";
  }

  return {
    targetKey,
    status,
    qualifyingRouteIds: accepted.map((route) => route.routeId),
    disqualifiedRouteIds: disqualified.map((route) => route.routeId),
    distinctStartAnchors,
    independentLineages,
    note:
      "Independent rediscovery strengthens a lead, but does not establish conduct or promote a finding.",
  };
}

export function buildReverseRediscoverySeeds(input: {
  leftEntityLabel: string;
  rightEntityLabel: string;
  relationshipHint: string;
}): Array<{
  startAnchor: string;
  seed: string;
  objective: string;
}> {
  const left = text(input.leftEntityLabel, "left_entity_label", 1000);
  const right = text(input.rightEntityLabel, "right_entity_label", 1000);
  const hint = text(input.relationshipHint, "relationship_hint", 2000);

  return [
    {
      startAnchor: left,
      seed: left + " independent primary record " + hint,
      objective:
        "Start from " +
        left +
        " without using the known relationship as a premise. Test whether primary records independently recover " +
        right +
        ". Seek counterevidence and identity conflicts.",
    },
    {
      startAnchor: right,
      seed: right + " independent primary record " + hint,
      objective:
        "Start from " +
        right +
        " without using the known relationship as a premise. Test whether primary records independently recover " +
        left +
        ". Seek counterevidence and identity conflicts.",
    },
  ];
}
