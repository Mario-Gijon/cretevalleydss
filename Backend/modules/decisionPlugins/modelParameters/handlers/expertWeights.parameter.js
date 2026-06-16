import { hasOwnKey, isPlainObject } from "../../../../utils/common/objects.js";
import { toInvalid, toValid } from "../parameterValidationResult.js";
import {
  normalizeNonEmptyString,
  normalizeNumberValue,
} from "../parameterValues.js";

export const EXPERT_WEIGHT_DECIMALS = 3;
export const EXPERT_WEIGHT_STEP = 10 ** -EXPERT_WEIGHT_DECIMALS;

export const getExpertWeightSumTolerance = (expertCount) =>
  Math.max(EXPERT_WEIGHT_STEP, expertCount * EXPERT_WEIGHT_STEP * 0.5);

const normalizeSelectedExperts = (selectedExperts) => {
  if (!Array.isArray(selectedExperts)) {
    return [];
  }

  return selectedExperts
    .map((expert) => ({
      id: normalizeNonEmptyString(expert?.id ?? expert?._id),
      name: normalizeNonEmptyString(expert?.name),
      email: normalizeNonEmptyString(expert?.email),
    }))
    .filter((expert) => Boolean(expert.id));
};

export const validateAndNormalizeExpertWeightsParameter = ({
  value,
  context,
}) => {
  if (!isPlainObject(value)) {
    return toInvalid("must be an object keyed by selected expert id", value);
  }

  const selectedExperts = normalizeSelectedExperts(context?.selectedExperts);

  if (selectedExperts.length === 0) {
    return toInvalid("cannot validate expert weights without selected experts", value);
  }

  const expertIds = selectedExperts.map((expert) => expert.id);
  const expertIdSet = new Set(expertIds);
  const unknownExpertId = Object.keys(value).find((expertId) => !expertIdSet.has(expertId));

  if (unknownExpertId) {
    return toInvalid(`contains unknown expert weight '${unknownExpertId}'`, value);
  }

  const normalizedWeights = {};

  for (const expert of selectedExperts) {
    if (!hasOwnKey(value, expert.id)) {
      return toInvalid(`is missing required weight for expert '${expert.id}'`, value);
    }

    const normalizedWeight = normalizeNumberValue(value[expert.id]);

    if (normalizedWeight === null || !Number.isFinite(normalizedWeight)) {
      return toInvalid(`contains invalid weight for expert '${expert.id}'`, value[expert.id]);
    }

    const roundedWeight = Number(normalizedWeight.toFixed(EXPERT_WEIGHT_DECIMALS));

    if (roundedWeight < 0 || roundedWeight > 1) {
      return toInvalid(
        `contains invalid weight for expert '${expert.id}'`,
        value[expert.id]
      );
    }

    normalizedWeights[expert.id] = roundedWeight;
  }

  const sum = expertIds.reduce(
    (total, expertId) => total + normalizedWeights[expertId],
    0
  );
  const tolerance = getExpertWeightSumTolerance(expertIds.length);

  if (Math.abs(sum - 1) > tolerance) {
    return toInvalid("expert weights must sum approximately to 1", normalizedWeights);
  }

  return toValid(normalizedWeights);
};
