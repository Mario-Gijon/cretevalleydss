import { getLinguisticMembershipDefinition } from "./linguisticMembershipFunctions";

export const getExpressionDomainName = (domain) => {
  const name = String(domain?.name || "").trim();
  return name || "Unnamed";
};

export const getExpressionDomainTypeKey = (domain) => {
  const typeKey = String(domain?.typeKey || "").trim();
  return typeKey || "";
};

export const getExpressionDomainFamily = (domain) => {
  const family = String(domain?.family || "").trim();
  return family || "";
};

export const getExpressionDomainDefinition = (domain) => {
  const definition = domain?.definition;

  return definition && typeof definition === "object" && !Array.isArray(definition)
    ? definition
    : {};
};

export const getExpressionDomainConstraintValue = (domain, constraintKey) => {
  const definition = getExpressionDomainDefinition(domain);

  if (constraintKey === "labelCount") {
    const directCount = Number(definition.labelCount);

    if (Number.isInteger(directCount) && directCount > 0) {
      return directCount;
    }

    const labels = Array.isArray(definition.labels) ? definition.labels : [];
    return labels.length > 0 ? labels.length : null;
  }

  return definition[constraintKey];
};

export const normalizeSupportedExpressionDomains = (
  supportedExpressionDomains
) =>
  (Array.isArray(supportedExpressionDomains) ? supportedExpressionDomains : [])
    .filter(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof entry.typeKey === "string" &&
        entry.typeKey.trim()
    )
    .map((entry) => ({
      typeKey: entry.typeKey.trim(),
      constraints:
        entry.constraints &&
        typeof entry.constraints === "object" &&
        !Array.isArray(entry.constraints)
          ? entry.constraints
          : {},
    }));

export const expressionDomainMatchesSupportedEntry = (
  domain,
  supportedEntry
) => {
  const domainTypeKey = getExpressionDomainTypeKey(domain);
  const supportedTypeKey = String(supportedEntry?.typeKey || "").trim();

  if (!domainTypeKey || !supportedTypeKey || domainTypeKey !== supportedTypeKey) {
    return false;
  }

  const constraints =
    supportedEntry?.constraints &&
    typeof supportedEntry.constraints === "object" &&
    !Array.isArray(supportedEntry.constraints)
      ? supportedEntry.constraints
      : {};

  return Object.entries(constraints).every(([constraintKey, expectedValue]) => {
    const actualValue = getExpressionDomainConstraintValue(domain, constraintKey);

    if (Array.isArray(expectedValue)) {
      return expectedValue.includes(actualValue);
    }

    return actualValue === expectedValue;
  });
};

export const getExpressionDomainLabels = (domain) => {
  const labels = getExpressionDomainDefinition(domain).labels;
  return Array.isArray(labels) ? labels : [];
};

export const getExpressionDomainLabelCount = (domain) => {
  const definition = getExpressionDomainDefinition(domain);
  const directCount = Number(definition.labelCount);

  if (Number.isInteger(directCount) && directCount > 0) {
    return directCount;
  }

  const labels = getExpressionDomainLabels(domain);
  return labels.length > 0 ? labels.length : null;
};

export const getExpressionDomainMembershipFunction = (domain) => {
  const membershipFunction = String(
    getExpressionDomainDefinition(domain).membershipFunction || ""
  ).trim();

  return membershipFunction || "";
};

export const getExpressionDomainNumericRange = (domain) => {
  const definition = getExpressionDomainDefinition(domain);

  return {
    min: Number.isFinite(definition.min) ? definition.min : null,
    max: Number.isFinite(definition.max) ? definition.max : null,
    step: Number.isFinite(definition.step) ? definition.step : null,
  };
};

export const isNumericContinuousExpressionDomain = (domain) =>
  getExpressionDomainTypeKey(domain) === "numericContinuous";

export const isNumericDiscreteExpressionDomain = (domain) =>
  getExpressionDomainTypeKey(domain) === "numericDiscrete";

export const isLinguisticOrdinalExpressionDomain = (domain) =>
  getExpressionDomainTypeKey(domain) === "linguisticOrdinal";

export const isLinguisticFuzzyExpressionDomain = (domain) =>
  getExpressionDomainTypeKey(domain) === "linguisticFuzzy";

export const getExpressionDomainFuzzyValueCount = (domain) => {
  if (!isLinguisticFuzzyExpressionDomain(domain)) {
    return null;
  }

  const labels = getExpressionDomainLabels(domain);
  const firstLabelValues = labels[0]?.values;

  if (Array.isArray(firstLabelValues) && firstLabelValues.length >= 2) {
    return firstLabelValues.length;
  }

  const membershipDefinition = getLinguisticMembershipDefinition(
    getExpressionDomainMembershipFunction(domain)
  );

  return Number.isInteger(membershipDefinition?.valueCount) &&
    membershipDefinition.valueCount >= 2
    ? membershipDefinition.valueCount
    : null;
};

const formatNumericBounds = ({ min, max }) =>
  Number.isFinite(min) && Number.isFinite(max) ? `[${min}, ${max}]` : null;

export const getExpressionDomainDisplayMeta = (domain) => {
  const name = getExpressionDomainName(domain);
  const typeKey = getExpressionDomainTypeKey(domain);
  const labelCount = getExpressionDomainLabelCount(domain);
  const membershipFunction = getExpressionDomainMembershipFunction(domain);
  const numericRange = getExpressionDomainNumericRange(domain);

  let descriptor = typeKey || "unknown";

  if (typeKey === "numericContinuous") {
    const bounds = formatNumericBounds(numericRange);
    descriptor = bounds
      ? `Numeric continuous ${bounds}`
      : "Numeric continuous";
  } else if (typeKey === "numericDiscrete") {
    const bounds = formatNumericBounds(numericRange);
    const stepLabel = Number.isFinite(numericRange.step)
      ? ` step ${numericRange.step}`
      : "";
    descriptor = bounds
      ? `Numeric discrete ${bounds}${stepLabel}`
      : `Numeric discrete${stepLabel}`;
  } else if (typeKey === "linguisticOrdinal") {
    descriptor = labelCount
      ? `Ordered linguistic (${labelCount} labels)`
      : "Ordered linguistic";
  } else if (typeKey === "linguisticFuzzy") {
    const labelCountText = labelCount ? ` (${labelCount} labels)` : "";
    descriptor = membershipFunction
      ? `Fuzzy linguistic ${membershipFunction}${labelCountText}`
      : `Fuzzy linguistic${labelCountText}`;
  }

  return {
    name,
    typeKey,
    family: getExpressionDomainFamily(domain),
    descriptor,
    label: `${name} · ${descriptor}`,
  };
};

export const formatExpressionDomainDisplayLabel = (domain) =>
  getExpressionDomainDisplayMeta(domain).label;
