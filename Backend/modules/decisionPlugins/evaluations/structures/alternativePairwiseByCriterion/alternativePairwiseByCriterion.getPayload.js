import {
  buildExpectedPairsByCriterion,
  resolveAlternativesAndCriteria,
} from "./alternativePairwiseByCriterion.context.js";
import {
  buildEmptyCell,
  normalizePayloadOrThrow,
} from "./alternativePairwiseByCriterion.payload.js";

const buildEmptyMatrix = ({ alternatives }) =>
  Object.fromEntries(
    alternatives.map((rowAlternative) => [
      rowAlternative.id,
      Object.fromEntries(
        alternatives
          .filter((columnAlternative) => columnAlternative.id !== rowAlternative.id)
          .map((columnAlternative) => [columnAlternative.id, buildEmptyCell()])
      ),
    ])
  );

export const buildGetPayload = async ({ payload, evaluationContext }) => {
  const { alternatives, criteria, criterionIds } = await resolveAlternativesAndCriteria({
    evaluationContext,
  });
  const expectedPairsByCriterion = buildExpectedPairsByCriterion({
    criteria,
    alternatives,
  });

  if (payload === null || payload === undefined) {
    return {
      payload: Object.fromEntries(
        criterionIds.map((criterionId) => [
          criterionId,
          buildEmptyMatrix({ alternatives }),
        ])
      ),
      context: {
        alternatives,
        criteria,
        criterionIds,
        expectedPairsByCriterion,
      },
    };
  }

  const normalizedPayload = await normalizePayloadOrThrow({
    payload,
    evaluationContext,
    requireValue: false,
  });

  return {
    payload: normalizedPayload,
    context: {
      alternatives,
      criteria,
      criterionIds,
      expectedPairsByCriterion,
    },
  };
};
