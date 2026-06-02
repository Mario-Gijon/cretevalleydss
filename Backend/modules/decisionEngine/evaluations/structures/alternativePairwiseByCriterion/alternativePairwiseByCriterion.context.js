import { getOrderedAlternativeAndCriterionNames } from "../shared/alternativeEvaluation.helpers.js";

export const buildComparisonKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

export const buildExpectedPairsByCriterion = ({ criteria, alternativeNames }) => {
  const expectedPairsByCriterion = {};

  for (const criterion of criteria) {
    const criterionName = String(criterion?.name || "");
    expectedPairsByCriterion[criterionName] = {
      pairs: [],
      expressionDomain: criterion?.expressionDomain || null,
    };

    for (const alternativeA of alternativeNames) {
      for (const alternativeB of alternativeNames) {
        if (alternativeA === alternativeB) {
          continue;
        }

        expectedPairsByCriterion[criterionName].pairs.push(
          buildComparisonKey(alternativeA, alternativeB)
        );
      }
    }
  }

  return expectedPairsByCriterion;
};

export const resolveAlternativesAndCriteria = async ({
  issue,
  alternatives,
  criteria,
}) => {
  const normalizedAlternatives = Array.isArray(alternatives)
    ? alternatives
        .map((alternative) =>
          typeof alternative === "string"
            ? alternative
            : String(alternative?.name || "")
        )
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  const normalizedCriteria = Array.isArray(criteria)
    ? criteria
        .map((criterion) =>
          typeof criterion === "string"
            ? {
                name: criterion.trim(),
                expressionDomain: null,
              }
            : {
                name: String(criterion?.name || "").trim(),
                expressionDomain: criterion?.expressionDomain || null,
              }
        )
        .filter((criterion) => criterion.name)
    : [];

  if (normalizedAlternatives.length > 0 && normalizedCriteria.length > 0) {
    return {
      alternativeNames: normalizedAlternatives,
      criteria: normalizedCriteria,
      criterionNames: normalizedCriteria.map((criterion) => criterion.name),
    };
  }

  return getOrderedAlternativeAndCriterionNames({ issue });
};
