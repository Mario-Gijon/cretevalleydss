import { isPlainObject } from "../../../../../utils/common/objects.js";
import { buildExpectedPairsByCriterion, resolveAlternativesAndCriteria } from "./alternativePairwiseByCriterion.context.js";
import { buildEmptyCell } from "./alternativePairwiseByCriterion.payload.js";

export const buildGetPayload = async ({
  payload,
  evaluationContext,
}) => {
  const {
    alternatives,
    criteria,
    criterionIds,
  } = await resolveAlternativesAndCriteria({
    evaluationContext,
  });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criteria,
    alternatives,
  });
  const storedPayload = isPlainObject(payload) ? payload : {};
  const comparisonsByCriterion = {};

  for (const criterionId of criterionIds) {
    const expectedPairsMeta = expectedPairsByCriterion[criterionId];
    const expectedPairs = expectedPairsMeta.pairs;
    const expectedExpressionDomain = expectedPairsMeta.expressionDomain;
    const storedCriterionComparisons = isPlainObject(storedPayload[criterionId])
      ? storedPayload[criterionId]
      : {};

    const criterionPayload = {};

    for (const alternative of alternatives) {
      const storedAlternativeRow = isPlainObject(storedCriterionComparisons[alternative.id])
        ? storedCriterionComparisons[alternative.id]
        : {};

      criterionPayload[alternative.id] = {};
      for (const pairKey of expectedPairs.filter((pair) => pair.startsWith(`${alternative.id}::`))) {
        const [, colAlternativeId] = pairKey.split("::");
        const storedCell = storedAlternativeRow[colAlternativeId];

        criterionPayload[alternative.id][colAlternativeId] = isPlainObject(storedCell)
          ? {
              value:
                storedCell.value === "" ||
                storedCell.value === null ||
                storedCell.value === undefined
                  ? ""
                  : storedCell.value,
              expressionDomain: expectedExpressionDomain,
            }
          : {
              ...buildEmptyCell(),
              expressionDomain: expectedExpressionDomain,
            };
      }
    }

    comparisonsByCriterion[criterionId] = criterionPayload;
  }

  return {
    payload: comparisonsByCriterion,
    context: {
      alternatives,
      criteria,
      criterionIds,
    },
  };
};
