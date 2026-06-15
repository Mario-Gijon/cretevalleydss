import { createInternalError } from "../../../../../utils/common/errors.js";

export const buildCellKey = (alternativeName, criterionName) =>
  `${alternativeName}::${criterionName}`;

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

export const buildExpectedCellMetadata = ({ alternativeNames, criteria }) => {
  const expectedKeys = [];
  const expressionDomainByCellKey = new Map();

  for (const alternativeName of alternativeNames) {
    for (const criterion of criteria) {
      const criterionName = criterion.name;
      const expressionDomain = criterion.expressionDomain;
      const cellKey = buildCellKey(alternativeName, criterionName);
      expectedKeys.push(cellKey);
      expressionDomainByCellKey.set(cellKey, expressionDomain);
    }
  }

  return {
    expectedKeys,
    expressionDomainByCellKey,
  };
};

export const resolveAlternativesAndCriteria = async ({ evaluationContext }) => {
  const normalizedAlternatives =
    requireEvaluationAlternativeNamesOrThrow(evaluationContext);
  const normalizedCriteria = requireEvaluationCriteriaOrThrow(evaluationContext);

  return {
    alternativeNames: normalizedAlternatives,
    criteria: normalizedCriteria,
  };
};
