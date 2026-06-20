let fallbackCounter = 0;

const nextFallbackCriterionId = () => {
  fallbackCounter += 1;
  return `criterion_${fallbackCounter}`;
};

export const buildCreateIssueCriterionId = () => {
  if (
    typeof globalThis.crypto === "object" &&
    globalThis.crypto !== null &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return nextFallbackCriterionId();
};

const normalizeCriterionId = (criterionId) => {
  if (typeof criterionId !== "string") {
    return null;
  }

  const normalizedCriterionId = criterionId.trim();
  return normalizedCriterionId === "" ? null : normalizedCriterionId;
};

export const ensureCriteriaTreeIds = (criteria) => {
  if (!Array.isArray(criteria)) {
    return [];
  }

  return criteria.map((criterion) => {
    const normalizedCriterionId = normalizeCriterionId(criterion?.id);

    return {
      ...criterion,
      id: normalizedCriterionId || buildCreateIssueCriterionId(),
      children: ensureCriteriaTreeIds(criterion?.children),
    };
  });
};
