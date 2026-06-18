import { createBadRequestError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";

export const EXPERT_WEIGHT_SUM_EPSILON = 0.0015;

export const modelUsesExpertWeights = (model) =>
  model.usesExpertWeights === true;

export const validateAndNormalizeExpertWeightsOrThrow = ({
  model,
  expertEmails,
  expertWeightsByEmail,
}) => {
  if (!modelUsesExpertWeights(model)) {
    if (expertWeightsByEmail !== null) {
      throw createBadRequestError("Expert weights are not supported by this model.", {
        field: "addedExperts",
      });
    }

    return null;
  }

  if (!isPlainObject(expertWeightsByEmail)) {
    throw createBadRequestError("Expert weights are required for this model.", {
      field: "addedExperts",
    });
  }

  const providedEmails = Object.keys(expertWeightsByEmail);

  if (providedEmails.length !== expertEmails.length) {
    throw createBadRequestError("Expert weights are required for this model.", {
      field: "addedExperts",
    });
  }

  const expectedEmailSet = new Set(expertEmails);
  let totalWeight = 0;

  for (const email of providedEmails) {
    if (!expectedEmailSet.has(email)) {
      throw createBadRequestError(
        "Expert weight provided for an expert that is not selected.",
        {
          field: "addedExperts",
        }
      );
    }
  }

  for (const email of expertEmails) {
    if (!Object.prototype.hasOwnProperty.call(expertWeightsByEmail, email)) {
      throw createBadRequestError("Expert weights are required for this model.", {
        field: "addedExperts",
      });
    }

    const weight = Number(expertWeightsByEmail[email]);

    if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
      throw createBadRequestError("Expert weights must sum to 1.", {
        field: "addedExperts",
      });
    }

    totalWeight += weight;
  }

  if (totalWeight <= 0 || Math.abs(totalWeight - 1) > EXPERT_WEIGHT_SUM_EPSILON) {
    throw createBadRequestError("Expert weights must sum to 1.", {
      field: "addedExperts",
    });
  }

  return expertEmails.reduce((accumulator, email) => {
    accumulator[email] = Number(expertWeightsByEmail[email]) / totalWeight;
    return accumulator;
  }, {});
};
