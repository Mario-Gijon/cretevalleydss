import { createInternalError } from "../../../../../utils/common/errors.js";
import { toIdString } from "../../../../../utils/common/ids.js";

export const buildComparisonKey = (alternativeAId, alternativeBId) =>
  `${alternativeAId}::${alternativeBId}`;

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

const requireEvaluationAlternativesOrThrow = (evaluationContext) => {
  const alternatives = requireEvaluationContextOrThrow(
    evaluationContext
  )?.alternatives;

  if (!Array.isArray(alternatives)) {
    throw createInternalError(
      "Evaluation structure context alternatives must be an array",
      {
        field: "evaluationContext.alternatives",
      }
    );
  }

  return alternatives.map((alternative, index) => {
    const id = toIdString(alternative?.id ?? alternative?._id);
    const name = typeof alternative?.name === "string" ? alternative.name.trim() : "";

    if (!id || !name) {
      throw createInternalError("Evaluation structure alternative is invalid", {
        field: `evaluationContext.alternatives[${index}]`,
      });
    }

    return { id, name };
  });
};

const requireEvaluationCriteriaOrThrow = (evaluationContext) => {
  const criteria = requireEvaluationContextOrThrow(evaluationContext)?.leafCriteria;

  if (!Array.isArray(criteria)) {
    throw createInternalError(
      "Evaluation structure context leafCriteria must be an array",
      {
        field: "evaluationContext.leafCriteria",
      }
    );
  }

  return criteria.map((criterion, index) => {
    const id = toIdString(criterion?.id ?? criterion?._id);
    const name = typeof criterion?.name === "string" ? criterion.name.trim() : "";

    if (!id || !name) {
      throw createInternalError("Evaluation structure criterion is invalid", {
        field: `evaluationContext.leafCriteria[${index}]`,
      });
    }

    return {
      id,
      name,
      expressionDomain: criterion.expressionDomain,
    };
  });
};

export const buildExpectedPairsByCriterion = ({ criteria, alternatives }) => {
  const expectedPairsByCriterion = {};

  for (const criterion of criteria) {
    expectedPairsByCriterion[criterion.id] = {
      criterionId: criterion.id,
      criterionName: criterion.name,
      pairs: [],
      expressionDomain: criterion.expressionDomain,
    };

    for (const alternativeA of alternatives) {
      for (const alternativeB of alternatives) {
        if (alternativeA.id === alternativeB.id) {
          continue;
        }

        expectedPairsByCriterion[criterion.id].pairs.push(
          buildComparisonKey(alternativeA.id, alternativeB.id)
        );
      }
    }
  }

  return expectedPairsByCriterion;
};

export const resolveAlternativesAndCriteria = async ({ evaluationContext }) => {
  const alternatives = requireEvaluationAlternativesOrThrow(evaluationContext);
  const criteria = requireEvaluationCriteriaOrThrow(evaluationContext);

  return {
    alternatives,
    criteria,
    criterionIds: criteria.map((criterion) => criterion.id),
  };
};
