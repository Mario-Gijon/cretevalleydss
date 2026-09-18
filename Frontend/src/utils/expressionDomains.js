import { getLinguisticMembershipDefinition } from "./linguisticMembershipFunctions";
import { isPlainObject } from "./common/objects";
import {
  getExpressionDomainTypeMetadata,
  getExpressionDomainTypeMetadataOrThrow,
} from "../features/expressionDomains/expressionDomainTypeMetadataCatalog";

export const getExpressionDomainName = (domain) => {
  const name = String(domain?.name || "").trim();
  return name || "Unnamed";
};

export const getExpressionDomainTypeKey = (domain) => {
  const typeKey = String(domain?.typeKey || "").trim();
  return typeKey || "";
};

export const getExpressionDomainFamily = (domain) => {
  const typeKey = getExpressionDomainTypeKey(domain);
  return getExpressionDomainTypeMetadata(typeKey)?.family ?? "";
};

export const getRequiredExpressionDomainFamily = (domain) =>
  getExpressionDomainTypeMetadataOrThrow(getExpressionDomainTypeKey(domain)).family;

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

export const valuesMatchConstraint = (actualValue, expectedValue) => {
  if (Array.isArray(expectedValue)) {
    return expectedValue.includes(actualValue);
  }

  if (isPlainObject(expectedValue)) {
    if (!isPlainObject(actualValue)) {
      return false;
    }

    return Object.entries(expectedValue).every(([childKey, childExpectedValue]) =>
      valuesMatchConstraint(actualValue[childKey], childExpectedValue)
    );
  }

  return actualValue === expectedValue;
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

const formatSupportedNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : null;

const formatSupportedList = (values) => {
  const normalized = values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());

  if (normalized.length === 0) return "";
  if (normalized.length === 1) return normalized[0];
  if (normalized.length === 2) return `${normalized[0]} or ${normalized[1]}`;
  return `${normalized.slice(0, -1).join(", ")}, or ${normalized.at(-1)}`;
};

const formatSupportedLabelCounts = (value) => {
  const counts = (Array.isArray(value) ? value : [value])
    .filter((count) => Number.isInteger(count) && count > 0)
    .map(String);

  if (counts.length === 0) return "";
  return `${formatSupportedList(counts)} ${counts.length === 1 ? "label" : "labels"}`;
};

const formatSupportedMembershipFunctions = (value, metadata) => {
  const values = Array.isArray(value) ? value : [value];
  const labels = values
    .map((candidate) =>
      metadata.compatibilityConstraintFields
        .find((field) => field.key === "membershipFunction")
        ?.options?.find((option) => option.value === candidate)?.label
    )
    .filter(Boolean)
    .map((label) => label.toLocaleLowerCase());

  return labels.length > 0 ? formatSupportedList(labels) : "";
};

export const formatSupportedExpressionDomainEntry = (entry) => {
  if (!isPlainObject(entry)) return null;

  const typeKey = String(entry.typeKey || "").trim();
  const metadata = getExpressionDomainTypeMetadata(typeKey);
  if (!metadata) return null;

  const constraints = isPlainObject(entry.constraints) ? entry.constraints : {};
  let label = metadata.label;

  const min = formatSupportedNumber(constraints.min);
  const max = formatSupportedNumber(constraints.max);
  if (min !== null && max !== null) {
    label += ` [${min}, ${max}]`;
  }

  if (typeKey === "numericDiscrete") {
    const step = formatSupportedNumber(constraints.step);
    if (step !== null) label += ` (step ${step})`;
  }

  if (typeKey === "linguisticOrdinal" || typeKey === "linguistic2Tuple") {
    const labelCounts = formatSupportedLabelCounts(constraints.labelCount);
    if (labelCounts) label += ` (${labelCounts})`;
  }

  if (typeKey === "linguisticFuzzy") {
    const memberships = formatSupportedMembershipFunctions(
      constraints.membershipFunction,
      metadata
    );
    if (memberships) label += ` (${memberships} membership)`;

    const labelCounts = formatSupportedLabelCounts(constraints.labelCount);
    if (labelCounts) {
      label += memberships ? ` (${labelCounts})` : ` (${labelCounts})`;
    }
  }

  return label;
};

export const formatSupportedExpressionDomainLabels = (
  supportedExpressionDomains
) =>
  normalizeSupportedExpressionDomains(supportedExpressionDomains)
    .map(formatSupportedExpressionDomainEntry)
    .filter(Boolean);

export const formatSupportedExpressionDomainRequirement = ({
  modelName,
  supportedExpressionDomains,
}) => {
  const labels = formatSupportedExpressionDomainLabels(supportedExpressionDomains);
  const safeModelName = String(modelName || "This model").trim() || "This model";

  if (labels.length === 0) return "";

  const entries = normalizeSupportedExpressionDomains(supportedExpressionDomains).filter(
    (entry) => formatSupportedExpressionDomainEntry(entry)
  );
  const firstEntry = entries[0];
  const firstConstraints = isPlainObject(firstEntry?.constraints)
    ? firstEntry.constraints
    : {};
  const min = formatSupportedNumber(firstConstraints.min);
  const max = formatSupportedNumber(firstConstraints.max);

  if (labels.length === 1 && firstEntry?.typeKey === "numericContinuous" && min !== null && max !== null) {
    return `${safeModelName} requires a Numeric continuous domain from ${min} to ${max}. Create a compatible expression domain to continue.`;
  }

  if (labels.length === 1 && firstEntry?.typeKey === "linguisticFuzzy") {
    const memberships = formatSupportedMembershipFunctions(
      firstConstraints.membershipFunction,
      getExpressionDomainTypeMetadata(firstEntry.typeKey)
    );
    if (memberships) {
      return `${safeModelName} requires a Fuzzy linguistic domain with ${memberships} membership. Create a compatible expression domain to continue.`;
    }
  }

  if (labels.length === 1) {
    const article = /^[aeiou]/i.test(labels[0]) ? "an" : "a";
    return `${safeModelName} requires ${article} ${labels[0]} domain. Create a compatible expression domain to continue.`;
  }

  return `${safeModelName} requires one of the supported expression domains: ${formatSupportedList(labels)}. Create a compatible expression domain to continue.`;
};

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
    return valuesMatchConstraint(actualValue, expectedValue);
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

export const isLinguistic2TupleExpressionDomain = (domain) =>
  getExpressionDomainTypeKey(domain) === "linguistic2Tuple";

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
  } else if (typeKey === "linguistic2Tuple") {
    descriptor = labelCount
      ? `Linguistic 2-Tuple (${labelCount} labels)`
      : "Linguistic 2-Tuple";
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
