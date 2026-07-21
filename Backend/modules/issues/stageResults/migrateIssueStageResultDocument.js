const cloneJsonCompatible = (value, fallback) => {
  if (value === undefined) return fallback;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

export const LEGACY_ISSUE_STAGE_RESULT_FIELDS = [
  "consensusMeasure",
  "rankedAlternatives",
  "collectiveEvaluations",
  "plotsGraphic",
  "modelExecution",
  "rawOutput",
  "expertWeights",
];

const hasNestedStageResultContract = (document) =>
  Boolean(document?.inputSnapshot && document?.result);

const hasLegacyStageResultFields = (document) =>
  LEGACY_ISSUE_STAGE_RESULT_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(document ?? {}, field)
  );

const isFiniteWeightsByCriterion = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).length > 0 &&
  Object.values(value).every(
    (weight) => typeof weight === "number" && Number.isFinite(weight)
  );

const recoverWeightsByCriterion = (document) => {
  const candidates = [
    document?.collectiveEvaluations?.weightsByCriterion,
    document?.rawOutput?.weightsByCriterion,
    document?.modelExecution?.weightsByCriterion,
  ];
  const weights = candidates.find(isFiniteWeightsByCriterion);
  return weights ? cloneJsonCompatible(weights, null) : undefined;
};

export const isIssueStageResultMigrated = (document) =>
  hasNestedStageResultContract(document) && !hasLegacyStageResultFields(document);

export const buildMigratedIssueStageResultFields = (document) => {
  if (hasNestedStageResultContract(document)) {
    return {
      inputSnapshot: document.inputSnapshot,
      result: document.result,
    };
  }

  const standardResult = {
    consensusMeasure: document?.consensusMeasure ?? null,
    collectiveEvaluations: cloneJsonCompatible(
      document?.collectiveEvaluations,
      {}
    ),
  };

  if (document?.stage === "criteriaWeighting") {
    const weightsByCriterion = recoverWeightsByCriterion(document);
    if (weightsByCriterion !== undefined) {
      standardResult.weightsByCriterion = weightsByCriterion;
    }
  } else {
    standardResult.rankedAlternatives = cloneJsonCompatible(
      document?.rankedAlternatives,
      []
    );
    standardResult.plotsGraphic = cloneJsonCompatible(document?.plotsGraphic, {});
  }

  return {
    inputSnapshot: {
      expertWeights: cloneJsonCompatible(document?.expertWeights, []),
    },
    result: {
      standardResult,
      modelExecution: cloneJsonCompatible(document?.modelExecution, {}),
      rawOutput: cloneJsonCompatible(document?.rawOutput, {}),
    },
  };
};
