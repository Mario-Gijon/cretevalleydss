import { resolveAlternativesAndCriteria } from "./alternativeCriteriaMatrix.context.js";
import {
  buildEmptyCell,
  normalizePayloadOrThrow,
} from "./alternativeCriteriaMatrix.payload.js";

const buildEmptyMatrix = ({ alternatives, criteria }) =>
  Object.fromEntries(
    alternatives.map((alternative) => [
      alternative.id,
      Object.fromEntries(criteria.map((criterion) => [criterion.id, buildEmptyCell()])),
    ])
  );

export const buildGetPayload = async ({
  payload,
  evaluationContext,
}) => {
  const {
    alternatives,
    criteria,
  } = await resolveAlternativesAndCriteria({
    evaluationContext,
  });

  if (payload === null || payload === undefined) {
    return {
      payload: buildEmptyMatrix({
        alternatives,
        criteria,
      }),
      context: {
        alternatives,
        criteria,
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
    },
  };
};
