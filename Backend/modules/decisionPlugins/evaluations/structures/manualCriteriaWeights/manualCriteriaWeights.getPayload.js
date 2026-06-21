import { isPlainObject } from "../../../../../utils/common/objects.js";

const buildEmptyWeightsByCriterion = (criteria) =>
  criteria.reduce((accumulator, criterion) => {
    accumulator[criterion.id] = "";
    return accumulator;
  }, {});

const toWeightsByCriterionFromStoredPayload = (
  storedPayloadWeights,
  criteria
) => {
  const normalizedStoredWeights = isPlainObject(storedPayloadWeights)
    ? storedPayloadWeights
    : {};

  return criteria.reduce((accumulator, criterion) => {
    const value = normalizedStoredWeights[criterion.id];
    accumulator[criterion.id] = value === undefined ? "" : value;
    return accumulator;
  }, {});
};

const resolveCriteria = async ({ evaluationContext }) =>
  Array.isArray(evaluationContext?.leafCriteria)
    ? evaluationContext.leafCriteria
        .map((criterion) => ({
          id: criterion?.id,
          name: criterion?.name,
        }))
        .filter((criterion) => criterion.id && criterion.name)
    : [];

export const buildGetPayload = async ({
  payload,
  evaluationContext,
}) => {
  const criteria = await resolveCriteria({ evaluationContext });

  const normalizedPayload = !payload || typeof payload !== "object"
    ? {
        weightsByCriterion: buildEmptyWeightsByCriterion(criteria),
      }
    : {
        weightsByCriterion: toWeightsByCriterionFromStoredPayload(
          payload?.weightsByCriterion,
          criteria
        ),
      };

  return {
    payload: normalizedPayload,
    criteria,
  };
};
