const isNumericDomain = (domain) => domain?.type === "numeric";
const isLinguisticDomain = (domain) => domain?.type === "linguistic";

const formatNumber = (value) => {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value).toString();
};

export const formatExpressionDomainLabel = (domain) => {
  if (!domain) return "No domain";

  const parts = [];
  const domainName = typeof domain?.name === "string" ? domain.name.trim() : "";

  if (domainName) {
    parts.push(domainName);
  }

  if (isNumericDomain(domain)) {
    const min = domain.numericRange?.min;
    const max = domain.numericRange?.max;
    const step = domain.numericRange?.step;
    const hasBounds = Number.isFinite(min) && Number.isFinite(max);
    const boundsLabel =
      hasBounds ? `${formatNumber(min)}-${formatNumber(max)}` : null;
    const stepLabel = Number.isFinite(step) ? `step ${formatNumber(step)}` : null;

    parts.push("numeric");

    if (boundsLabel) {
      parts.push(boundsLabel);
    }

    if (stepLabel) {
      parts.push(stepLabel);
    }

    return parts.join(" · ");
  }

  if (isLinguisticDomain(domain)) {
    const labelsCount =
      Number(domain.valueCount) ||
      (Array.isArray(domain.linguisticLabels)
        ? domain.linguisticLabels.length
        : 0);

    parts.push("linguistic");

    if (labelsCount > 0) {
      parts.push(`${labelsCount} labels`);
    }

    return parts.join(" · ");
  }

  return parts.join(" · ") || "No domain";
};
