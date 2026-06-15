import { isPlainObject } from "../../../../../utils/common/objects.js";

const buildEmptyWeightsByCriterion = (criterionNames) =>
  criterionNames.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = "";
    return accumulator;
  }, {});

const toWeightsByCriterionFromStoredPayload = (
  storedPayloadWeights,
  criterionNames
) => {
  const normalizedStoredWeights = isPlainObject(storedPayloadWeights)
    ? storedPayloadWeights
    : {};

  return criterionNames.reduce((accumulator, criterionName) => {
    const value = normalizedStoredWeights[criterionName];
    accumulator[criterionName] = value === undefined ? "" : value;
    return accumulator;
  }, {});
};

const resolveCriterionNames = async ({ evaluationContext }) => {
  if (
    Array.isArray(evaluationContext?.criteria?.leafNames) &&
    evaluationContext.criteria.leafNames.length > 0
  ) {
    return evaluationContext.criteria.leafNames.filter(Boolean);
  }

  return [];
};

export const buildGetPayload = async ({
  payload,
  evaluationContext,
}) => {
  const criterionNames = await resolveCriterionNames({ evaluationContext });

  const normalizedPayload = !payload || typeof payload !== "object"
    ? {
        weightsByCriterion: buildEmptyWeightsByCriterion(criterionNames),
      }
    : {
        weightsByCriterion: toWeightsByCriterionFromStoredPayload(
          payload?.weightsByCriterion,
          criterionNames
        ),
      };

  return {
    payload: normalizedPayload,
    criterionNames,
  };
};
