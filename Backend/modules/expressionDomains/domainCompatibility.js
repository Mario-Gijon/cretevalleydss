import { toIdString } from "../../utils/common/ids.js";
import { isPlainObject } from "../../utils/common/objects.js";

const normalizeSupportedExpressionDomains = (
  supportedExpressionDomains
) => {
  if (!Array.isArray(supportedExpressionDomains)) {
    return [];
  }

  return supportedExpressionDomains.filter(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof entry.typeKey === "string" &&
      entry.typeKey.trim()
  );
};

const getDefinitionConstraintValue = (domain, constraintKey) => {
  if (constraintKey === "labelCount") {
    const directLabelCount = Number(domain?.definition?.labelCount);

    if (Number.isInteger(directLabelCount) && directLabelCount > 0) {
      return directLabelCount;
    }

    const labels = domain?.definition?.labels;
    return Array.isArray(labels) ? labels.length : undefined;
  }

  return domain?.definition?.[constraintKey];
};

const valuesMatchConstraint = (actualValue, expectedValue) => {
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

const matchesConstraint = ({ domain, constraintKey, expectedValue }) => {
  const actualValue = getDefinitionConstraintValue(domain, constraintKey);
  return valuesMatchConstraint(actualValue, expectedValue);
};

const supportedEntryMatchesDomain = ({ domain, supportedEntry }) => {
  const domainTypeKey = String(domain?.typeKey || "").trim();
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

  return Object.entries(constraints).every(([constraintKey, expectedValue]) =>
    matchesConstraint({
      domain,
      constraintKey,
      expectedValue,
    })
  );
};

export const isNumericDiscreteDomain = (domain) =>
  domain?.typeKey === "numericDiscrete";

export const isSupportedDomainForModel = ({
  domain,
  modelSupportedExpressionDomains,
  userId,
}) => {
  const supportedEntries = normalizeSupportedExpressionDomains(
    modelSupportedExpressionDomains
  );

  if (supportedEntries.length === 0) {
    return false;
  }

  const normalizedDomainOwnerId = toIdString(domain?.owner);
  const isCreatorOwnedDomain =
    normalizedDomainOwnerId && normalizedDomainOwnerId === toIdString(userId);
  const isAccessibleDomain = domain?.owner === null || isCreatorOwnedDomain;

  if (!isAccessibleDomain) {
    return false;
  }

  return supportedEntries.some((supportedEntry) =>
    supportedEntryMatchesDomain({
      domain,
      supportedEntry,
    })
  );
};

export const isDomainSnapshotSupportedByModel = ({
  domainSnapshot,
  supportedExpressionDomains,
}) => {
  const supportedEntries = normalizeSupportedExpressionDomains(
    supportedExpressionDomains
  );

  return supportedEntries.some((supportedEntry) =>
    supportedEntryMatchesDomain({
      domain: domainSnapshot,
      supportedEntry,
    })
  );
};
