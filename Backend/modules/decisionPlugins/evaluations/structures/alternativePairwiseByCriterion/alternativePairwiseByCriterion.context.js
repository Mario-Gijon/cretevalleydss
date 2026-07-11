import { createInternalError } from "../../../../../utils/common/errors.js";
import { toIdString } from "../../../../../utils/common/ids.js";
import { assertPairwiseReflectionCompatible } from "../../../../expressionDomains/operations/assertPairwiseReflectionCompatible.js";
import { isPlainObject } from "../../../../../utils/common/objects.js";

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

    return { id, name, index };
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

    if (!isPlainObject(criterion?.expressionDomain)) {
      throw createInternalError("Evaluation structure criterion expressionDomain is invalid", {
        field: `evaluationContext.leafCriteria[${index}].expressionDomain`,
      });
    }

    assertPairwiseReflectionCompatible(criterion.expressionDomain);

    return {
      id,
      name,
      expressionDomain: criterion.expressionDomain,
      index,
    };
  });
};

export const buildExpectedPairsByCriterion = ({ criteria, alternatives }) => {
  const expectedPairsByCriterion = {};

  for (const criterion of criteria) {
    expectedPairsByCriterion[criterion.id] = {
      criterionId: criterion.id,
      criterionName: criterion.name,
      expressionDomain: criterion.expressionDomain,
      editablePairs: [],
      directedPairs: [],
      rowAlternativeIds: alternatives.map((alternative) => alternative.id),
      columnAlternativeIds: alternatives.map((alternative) => alternative.id),
    };

    for (let rowIndex = 0; rowIndex < alternatives.length; rowIndex += 1) {
      const rowAlternative = alternatives[rowIndex];

      for (let columnIndex = 0; columnIndex < alternatives.length; columnIndex += 1) {
        const columnAlternative = alternatives[columnIndex];

        if (rowAlternative.id === columnAlternative.id) {
          continue;
        }

        expectedPairsByCriterion[criterion.id].directedPairs.push({
          rowAlternativeId: rowAlternative.id,
          columnAlternativeId: columnAlternative.id,
          rowIndex,
          columnIndex,
          key: buildComparisonKey(rowAlternative.id, columnAlternative.id),
        });

        if (rowIndex < columnIndex) {
          expectedPairsByCriterion[criterion.id].editablePairs.push({
            rowAlternativeId: rowAlternative.id,
            columnAlternativeId: columnAlternative.id,
            rowIndex,
            columnIndex,
            upperKey: buildComparisonKey(rowAlternative.id, columnAlternative.id),
            lowerKey: buildComparisonKey(columnAlternative.id, rowAlternative.id),
          });
        }
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
