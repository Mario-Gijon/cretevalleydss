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

const resolveCriterionNames = async ({ structureContext }) => {
  if (Array.isArray(structureContext?.leafCriteria) && structureContext.leafCriteria.length > 0) {
    return structureContext.leafCriteria
      .map((criterion) =>
        typeof criterion === "string"
          ? criterion.trim()
          : String(criterion?.name || "").trim()
      )
      .filter(Boolean);
  }

  return [];
};

export const buildGetPayload = async ({
  storedEvaluation,
  structureContext,
}) => {
  const criterionNames = await resolveCriterionNames({ structureContext });

  const payload = !storedEvaluation
    ? {
        weightsByCriterion: buildEmptyWeightsByCriterion(criterionNames),
      }
    : {
        weightsByCriterion: toWeightsByCriterionFromStoredPayload(
          storedEvaluation?.payload?.weightsByCriterion,
          criterionNames
        ),
      };

  return {
    payload,
    criterionNames,
  };
};
