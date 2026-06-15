import { isPlainObject } from "../../../../../utils/common/objects.js";
import {
  buildExpectedPairsByCriterion,
  resolveAlternativesAndCriteria,
} from "./alternativePairwiseByCriterion.context.js";
import { buildEmptyCell } from "./alternativePairwiseByCriterion.payload.js";

export const buildGetPayload = async ({
  payload,
  evaluationContext,
}) => {
  const {
    alternativeNames,
    criteria: resolvedCriteria,
    criterionNames,
  } = await resolveAlternativesAndCriteria({
    evaluationContext,
  });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criteria: resolvedCriteria,
    alternativeNames,
  });

  const storedComparisonsByCriterion = isPlainObject(
    payload?.comparisonsByCriterion
  )
    ? payload.comparisonsByCriterion
    : {};

  const comparisonsByCriterion = {};

  for (const criterionName of criterionNames) {
    const expectedPairsMeta = expectedPairsByCriterion[criterionName];
    const expectedPairs = expectedPairsMeta.pairs;
    const expectedExpressionDomain = expectedPairsMeta.expressionDomain;
    const storedCriterionComparisons = isPlainObject(
      storedComparisonsByCriterion[criterionName]
    )
      ? storedComparisonsByCriterion[criterionName]
      : {};

    comparisonsByCriterion[criterionName] = expectedPairs.reduce(
      (criterionComparisons, pairKey) => {
        const storedCell = storedCriterionComparisons[pairKey];

        if (!isPlainObject(storedCell)) {
          criterionComparisons[pairKey] = {
            ...buildEmptyCell(),
            expressionDomain: expectedExpressionDomain,
          };
          return criterionComparisons;
        }

        criterionComparisons[pairKey] = {
          value:
            storedCell.value === "" ||
            storedCell.value === null ||
            storedCell.value === undefined
              ? ""
              : storedCell.value,
          expressionDomain: expectedExpressionDomain,
        };

        return criterionComparisons;
      },
      {}
    );
  }

  return {
    payload: {
      comparisonsByCriterion,
    },
    context: {
      alternativeNames,
      criteria: resolvedCriteria,
      criterionNames,
    },
  };
};
