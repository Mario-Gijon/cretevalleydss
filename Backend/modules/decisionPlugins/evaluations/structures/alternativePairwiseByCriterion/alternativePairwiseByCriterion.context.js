import { createInternalError } from "../../../../../utils/common/errors.js";

export const buildComparisonKey = (alternativeA, alternativeB) =>
  `${alternativeA}::${alternativeB}`;

const requireEvaluationContextOrThrow = (evaluationContext) => {
  if (
    !evaluationContext ||
    typeof evaluationContext !== "object" ||
    Array.isArray(evaluationContext)
  ) {
    throw createInternalError("Evaluation structure context is invalid", {
      field: "evaluationContext",
    });
  }

  return evaluationContext;
};

const requireEvaluationAlternativeNamesOrThrow = (evaluationContext) => {
  const alternatives = requireEvaluationContextOrThrow(
    evaluationContext
  )?.alternatives;

  if (!Array.isArray(alternatives?.items)) {
    throw createInternalError(
      "Evaluation structure context alternatives must be an array",
      {
        field: "evaluationContext.alternatives.items",
      }
    );
  }

  return alternatives.items.map((alternative, index) => {
    if (
      !alternative ||
      typeof alternative !== "object" ||
      Array.isArray(alternative) ||
      typeof alternative.name !== "string" ||
      alternative.name.trim() === ""
    ) {
      throw createInternalError("Evaluation structure alternative is invalid", {
        field: `evaluationContext.alternatives.items[${index}]`,
      });
    }

    return alternative.name.trim();
  });
};

const requireEvaluationCriteriaOrThrow = (evaluationContext) => {
  const criteria = requireEvaluationContextOrThrow(evaluationContext)?.criteria;

  if (!Array.isArray(criteria?.leafItems)) {
    throw createInternalError(
      "Evaluation structure context leafCriteria must be an array",
      {
        field: "evaluationContext.criteria.leafItems",
      }
    );
  }

  return criteria.leafItems.map((criterion, index) => {
    if (
      !criterion ||
      typeof criterion !== "object" ||
      Array.isArray(criterion) ||
      typeof criterion.name !== "string" ||
      criterion.name.trim() === ""
    ) {
      throw createInternalError("Evaluation structure criterion is invalid", {
        field: `evaluationContext.criteria.leafItems[${index}]`,
      });
    }

    return {
      name: criterion.name.trim(),
      expressionDomain: criterion.expressionDomain,
    };
  });
};

export const buildExpectedPairsByCriterion = ({ criteria, alternativeNames }) => {
  const expectedPairsByCriterion = {};

  for (const criterion of criteria) {
    const criterionName = criterion.name;
    expectedPairsByCriterion[criterionName] = {
      pairs: [],
      expressionDomain: criterion.expressionDomain,
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

export const resolveAlternativesAndCriteria = async ({ evaluationContext }) => {
  const normalizedAlternatives =
    requireEvaluationAlternativeNamesOrThrow(evaluationContext);
  const normalizedCriteria = requireEvaluationCriteriaOrThrow(evaluationContext);

  return {
    alternativeNames: normalizedAlternatives,
    criteria: normalizedCriteria,
    criterionNames: normalizedCriteria.map((criterion) => criterion.name),
  };
};
