const isNumericDomain = (domain) => domain?.type === "numeric";
const isLinguisticDomain = (domain) => domain?.type === "linguistic";

export const formatExpressionDomainLabel = (domain) => {
  if (!domain) return "No domain";

  if (isNumericDomain(domain)) {
    const min = domain?.numericRange?.min;
    const max = domain?.numericRange?.max;
    const step = domain?.numericRange?.step;
    const hasBounds = Number.isFinite(min) && Number.isFinite(max);
    const isDiscrete = Number(step) === 1;

    if (hasBounds) {
      return isDiscrete
        ? `Numeric ${min}-${max} discrete`
        : `Numeric ${min}-${max} continuous`;
    }

    return isDiscrete ? "Numeric discrete" : "Numeric continuous";
  }

  if (isLinguisticDomain(domain)) {
    const labelsCount =
      Number(domain?.valueCount) ||
      (Array.isArray(domain?.linguisticLabels)
        ? domain.linguisticLabels.length
        : 0);

    return labelsCount > 0
      ? `Linguistic ${labelsCount} labels`
      : "Linguistic";
  }

  return domain?.name || "No domain";
};

