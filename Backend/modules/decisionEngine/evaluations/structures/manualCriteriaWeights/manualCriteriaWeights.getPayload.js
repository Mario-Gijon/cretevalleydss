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

const orderObjectByKeys = (obj, orderedKeys) => {
  const orderedObject = {};
  const usedKeys = new Set();

  for (const key of orderedKeys) {
    orderedObject[key] = Object.prototype.hasOwnProperty.call(obj, key)
      ? obj[key]
      : null;
    usedKeys.add(key);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (!usedKeys.has(key)) {
      orderedObject[key] = value;
    }
  }

  return orderedObject;
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

export const buildDisplayMeta = ({ storedEvaluation, criterionNames }) => {
  const rawPayload = isPlainObject(storedEvaluation?.payload)
    ? storedEvaluation.payload
    : {};

  return {
    manualWeights: storedEvaluation && isPlainObject(rawPayload.weightsByCriterion)
      ? orderObjectByKeys(rawPayload.weightsByCriterion, criterionNames)
      : null,
  };
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
