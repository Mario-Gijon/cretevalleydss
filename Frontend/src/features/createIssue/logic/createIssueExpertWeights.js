export const EXPERT_WEIGHT_SUM_EPSILON = 0.0015;
export const EXPERT_WEIGHT_EQUAL_DISPLAY_EPSILON = 0.0005;

export const modelUsesExpertWeights = (model) =>
  model?.usesExpertWeights === true;

export const buildEqualExpertWeights = (expertEmails) => {
  if (expertEmails.length === 0) {
    return {};
  }

  const equalWeight = 1 / expertEmails.length;

  return expertEmails.reduce((accumulator, email) => {
    accumulator[email] = equalWeight;
    return accumulator;
  }, {});
};

export const syncExpertWeightsForSelection = ({
  expertEmails,
  previousExpertWeights,
  preserveCustomWeights,
}) => {
  if (!preserveCustomWeights) {
    return buildEqualExpertWeights(expertEmails);
  }

  return expertEmails.reduce((accumulator, email) => {
    accumulator[email] =
      previousExpertWeights && Number.isFinite(previousExpertWeights[email])
        ? previousExpertWeights[email]
        : 0;
    return accumulator;
  }, {});
};

export const areExpertWeightsEqual = ({
  expertEmails,
  expertWeights,
}) => {
  if (expertEmails.length === 0 || !expertWeights) {
    return false;
  }

  const equalWeight = 1 / expertEmails.length;

  for (const email of expertEmails) {
    const weight = Number(expertWeights[email]);

    if (!Number.isFinite(weight)) {
      return false;
    }

    if (Math.abs(weight - equalWeight) > EXPERT_WEIGHT_EQUAL_DISPLAY_EPSILON) {
      return false;
    }
  }

  return true;
};

export const validateExpertWeights = ({
  expertEmails,
  expertWeights,
}) => {
  if (expertEmails.length === 0) {
    return {
      valid: true,
      total: 0,
      tone: "warning",
      message: "Select at least one expert.",
    };
  }

  if (!expertWeights) {
    return {
      valid: false,
      total: null,
      tone: "error",
      message: "Expert weights are required for this model.",
    };
  }

  let total = 0;

  for (const email of expertEmails) {
    const weight = Number(expertWeights[email]);

    if (!Number.isFinite(weight)) {
      return {
        valid: false,
        total: null,
        tone: "error",
        message: "Expert weights are required for this model.",
      };
    }

    total += weight;
  }

  if (Math.abs(total - 1) > EXPERT_WEIGHT_SUM_EPSILON) {
    return {
      valid: false,
      total,
      tone: "error",
      message: "Expert weights must sum to 1.",
    };
  }

  return {
    valid: true,
    total,
    tone: "success",
    message: "Expert weights are valid.",
  };
};
