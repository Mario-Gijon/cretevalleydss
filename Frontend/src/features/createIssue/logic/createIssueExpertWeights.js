const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeExpertId = (value) => {
  const normalized = String(value ?? "").trim();
  return normalized || null;
};

export const EXPERT_WEIGHT_DECIMALS = 3;
export const EXPERT_WEIGHT_STEP = 10 ** -EXPERT_WEIGHT_DECIMALS;

export const getExpertWeightSumTolerance = (expertCount) =>
  Math.max(EXPERT_WEIGHT_STEP, expertCount * EXPERT_WEIGHT_STEP * 0.5);

export const isExpertWeightSumValid = ({ sum, expertCount }) =>
  Math.abs(sum - 1) <= getExpertWeightSumTolerance(expertCount);

export const buildEqualExpertWeights = (expertIds) => {
  const normalizedExpertIds = (Array.isArray(expertIds) ? expertIds : [])
    .map(normalizeExpertId)
    .filter(Boolean);

  if (normalizedExpertIds.length === 0) {
    return {};
  }

  if (normalizedExpertIds.length === 1) {
    return {
      [normalizedExpertIds[0]]: 1,
    };
  }

  const equalWeight = Number(
    (1 / normalizedExpertIds.length).toFixed(EXPERT_WEIGHT_DECIMALS)
  );

  return normalizedExpertIds.reduce((weights, expertId) => {
    weights[expertId] = equalWeight;
    return weights;
  }, {});
};

export const formatExpertWeightDisplay = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return numericValue.toFixed(EXPERT_WEIGHT_DECIMALS);
};

export const normalizeExpertWeightValue = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  return Number(numericValue.toFixed(EXPERT_WEIGHT_DECIMALS));
};

export const calculateExpertWeightSum = (expertWeights, expertIds) =>
  (Array.isArray(expertIds) ? expertIds : []).reduce((sum, expertId) => {
    const numericWeight = Number(expertWeights?.[expertId]);
    return Number.isFinite(numericWeight) ? sum + numericWeight : sum;
  }, 0);

export const validateCreateIssueExpertWeights = ({
  selectedModel,
  selectedExperts,
  expertWeights,
}) => {
  if (selectedModel?.usesExpertWeights !== true) {
    return null;
  }

  const experts = Array.isArray(selectedExperts) ? selectedExperts : [];

  if (experts.length === 0) {
    return "At least one expert must be selected.";
  }

  if (!isPlainObject(expertWeights)) {
    return "Expert weights are required.";
  }

  const expertIds = experts.map((expert) => normalizeExpertId(expert?.id)).filter(Boolean);
  const expectedExpertIdSet = new Set(expertIds);
  const unknownExpertId = Object.keys(expertWeights).find(
    (expertId) => !expectedExpertIdSet.has(expertId)
  );

  if (unknownExpertId) {
    return `Unknown expert weight '${unknownExpertId}'.`;
  }

  for (const expert of experts) {
    const expertId = normalizeExpertId(expert?.id);
    const expertLabel = expert?.name || expert?.email || expertId || "expert";

    if (!expertId || !Object.prototype.hasOwnProperty.call(expertWeights, expertId)) {
      return `Missing expert weight for '${expertLabel}'.`;
    }

    const numericWeight = Number(expertWeights[expertId]);

    if (!Number.isFinite(numericWeight)) {
      return `Invalid expert weight for '${expertLabel}'.`;
    }

    if (numericWeight < 0 || numericWeight > 1) {
      return `Expert weight for '${expertLabel}' must be between 0 and 1.`;
    }
  }

  const sum = calculateExpertWeightSum(expertWeights, expertIds);

  if (!isExpertWeightSumValid({ sum, expertCount: expertIds.length })) {
    return "Expert weights must sum approximately to 1.";
  }

  return null;
};
