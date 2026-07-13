import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";

export const EXPERT_WEIGHT_SUM_EPSILON = 0.0015;

export const modelUsesExpertWeights = (model) =>
  model?.usesExpertWeights === true;

export const buildExpertWeightSnapshotOrThrow = ({ model, participations }) => {
  if (!modelUsesExpertWeights(model)) {
    return {
      snapshot: [],
      weightsByExpertId: null,
    };
  }

  const sortedParticipations = [...participations].sort((left, right) =>
    toIdString(left.expert).localeCompare(toIdString(right.expert))
  );
  const emails = [];
  const rawWeightsByEmail = {};
  const participationByEmail = new Map();

  for (const participation of sortedParticipations) {
    const expertId = toIdString(participation.expert?._id || participation.expert);
    const email = String(participation.expert?.email || "").trim().toLowerCase();

    if (!expertId || !email || participationByEmail.has(email)) {
      throw createBadRequestError("Expert weights require valid unique participants.", {
        field: "participations",
      });
    }

    emails.push(email);
    rawWeightsByEmail[email] = participation.weight;
    participationByEmail.set(email, { participation, expertId });
  }

  const normalizedWeightsByEmail = validateAndNormalizeExpertWeightsOrThrow({
    model,
    expertEmails: emails,
    expertWeightsByEmail: rawWeightsByEmail,
  });
  const weightsByExpertId = new Map();
  const snapshot = emails.map((email) => {
    const { participation, expertId } = participationByEmail.get(email);
    const weight = normalizedWeightsByEmail[email];
    weightsByExpertId.set(expertId, weight);

    return {
      expert: participation.expert?._id || participation.expert,
      weight,
    };
  });

  return { snapshot, weightsByExpertId };
};

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

    const rawWeight = expertWeightsByEmail[email];
    if (rawWeight === null || rawWeight === undefined || rawWeight === "") {
      throw createBadRequestError("Expert weights are required for this model.", {
        field: "addedExperts",
      });
    }

    const weight = Number(rawWeight);

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
