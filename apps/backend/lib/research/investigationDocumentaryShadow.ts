export type DocumentaryFootprintExpectation = {
  documentFamily: string;
  expectation: "normally_expected" | "sometimes_expected";
  rationale: string;
};

export type DocumentaryFootprintProfile = {
  eventKind: string;
  cohortDescription: string;
  cohortSize: number;
  baselineEvidenceRefs: string[];
  expectations: DocumentaryFootprintExpectation[];
};

export type DocumentaryShadowResult = {
  eventKind: string;
  observedFamilies: string[];
  missingNormallyExpected: string[];
  missingSometimesExpected: string[];
  unexpectedFamilies: string[];
  status:
    | "insufficient_baseline"
    | "ordinary_shape"
    | "incomplete_shadow"
    | "unusual_shadow";
  searchQuestions: string[];
  note:
    "A documentary-shadow anomaly is a research lead, not evidence of wrongdoing or proof that a record does not exist.";
};

function text(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error("documentary_shadow_invalid_" + field);
  }
  return value.trim();
}

function uniqueTextArray(
  value: unknown,
  field: string,
  minItems = 0,
  maxItems = 100,
): string[] {
  if (!Array.isArray(value) ||
      value.length < minItems ||
      value.length > maxItems) {
    throw new Error("documentary_shadow_invalid_" + field);
  }
  const out = value.map((item) => text(item, field, 1000));
  if (new Set(out).size !== out.length) {
    throw new Error("documentary_shadow_duplicate_" + field);
  }
  return out;
}

export function compareDocumentaryShadow(input: {
  profile: DocumentaryFootprintProfile;
  observedDocumentFamilies: string[];
}): DocumentaryShadowResult {
  const eventKind = text(input.profile.eventKind, "event_kind", 500);
  text(input.profile.cohortDescription, "cohort_description", 4000);
  if (!Number.isSafeInteger(input.profile.cohortSize) ||
      input.profile.cohortSize < 1 ||
      input.profile.cohortSize > 1_000_000) {
    throw new Error("documentary_shadow_invalid_cohort_size");
  }
  const baselineEvidenceRefs = uniqueTextArray(
    input.profile.baselineEvidenceRefs,
    "baseline_evidence_refs",
    1,
    100,
  );
  const observedFamilies = uniqueTextArray(
    input.observedDocumentFamilies,
    "observed_document_families",
    0,
    100,
  ).sort();

  if (!Array.isArray(input.profile.expectations) ||
      input.profile.expectations.length < 1 ||
      input.profile.expectations.length > 50) {
    throw new Error("documentary_shadow_invalid_expectations");
  }

  const expected = input.profile.expectations.map((expectation) => ({
    documentFamily: text(
      expectation.documentFamily,
      "expected_document_family",
      500,
    ),
    expectation: expectation.expectation,
    rationale: text(expectation.rationale, "expectation_rationale", 4000),
  }));
  if (new Set(expected.map((item) => item.documentFamily)).size !== expected.length) {
    throw new Error("documentary_shadow_duplicate_document_family");
  }
  if (expected.some((item) =>
    !["normally_expected", "sometimes_expected"].includes(item.expectation))) {
    throw new Error("documentary_shadow_invalid_expectation_type");
  }

  const observed = new Set(observedFamilies);
  const normally = expected
    .filter((item) => item.expectation === "normally_expected")
    .map((item) => item.documentFamily);
  const sometimes = expected
    .filter((item) => item.expectation === "sometimes_expected")
    .map((item) => item.documentFamily);
  const expectedSet = new Set(expected.map((item) => item.documentFamily));

  const missingNormallyExpected = normally
    .filter((family) => !observed.has(family))
    .sort();
  const missingSometimesExpected = sometimes
    .filter((family) => !observed.has(family))
    .sort();
  const unexpectedFamilies = observedFamilies
    .filter((family) => !expectedSet.has(family))
    .sort();

  let status: DocumentaryShadowResult["status"];
  if (input.profile.cohortSize < 5 || baselineEvidenceRefs.length < 2) {
    status = "insufficient_baseline";
  } else if (missingNormallyExpected.length > 0 && unexpectedFamilies.length > 0) {
    status = "unusual_shadow";
  } else if (missingNormallyExpected.length > 0) {
    status = "incomplete_shadow";
  } else {
    status = "ordinary_shape";
  }

  const searchQuestions = [
    ...missingNormallyExpected.map(
      (family) =>
        "Search for missing normally expected document family: " + family,
    ),
    ...missingSometimesExpected.map(
      (family) =>
        "Check whether optional document family should exist here: " + family,
    ),
    ...unexpectedFamilies.map(
      (family) =>
        "Explain why this event has an additional document family: " + family,
    ),
  ];

  return {
    eventKind,
    observedFamilies,
    missingNormallyExpected,
    missingSometimesExpected,
    unexpectedFamilies,
    status,
    searchQuestions,
    note:
      "A documentary-shadow anomaly is a research lead, not evidence of wrongdoing or proof that a record does not exist.",
  };
}
