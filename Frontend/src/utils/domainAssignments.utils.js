import {
  expressionDomainMatchesSupportedEntry,
  getExpressionDomainNumericRange,
  getRequiredExpressionDomainFamily,
  isNumericContinuousExpressionDomain,
  isNumericDiscreteExpressionDomain,
  normalizeSupportedExpressionDomains,
} from "./expressionDomains";

const getModelDomainSupport = (selectedModel) => {
  const supportedExpressionDomains = normalizeSupportedExpressionDomains(
    selectedModel?.supportedExpressionDomains
  );

  return {
    supportedExpressionDomains,
    numericContinuous: supportedExpressionDomains.some(
      (entry) => entry.typeKey === "numericContinuous"
    ),
    numericDiscrete: supportedExpressionDomains.some(
      (entry) => entry.typeKey === "numericDiscrete"
    ),
    linguistic: supportedExpressionDomains.some(
      (entry) => entry.typeKey.startsWith("linguistic")
    ),
  };
};

const isNumericContinuousDomain = (domain) =>
  isNumericContinuousExpressionDomain(domain);

const isNumericDiscreteDomain = (domain) =>
  isNumericDiscreteExpressionDomain(domain);

export const getSupportedDomainPools = (
  selectedModel,
  globalDomains = [],
  expressionDomains = []
) => {
  const support = getModelDomainSupport(selectedModel);
  const visibleDomains = [...globalDomains, ...expressionDomains];
  const compatibleDomains = visibleDomains.filter((domain) =>
    support.supportedExpressionDomains.some((supportedEntry) =>
      expressionDomainMatchesSupportedEntry(domain, supportedEntry)
    )
  );

  const numericDomains = compatibleDomains.filter(
    (domain) => getRequiredExpressionDomainFamily(domain) === "numeric"
  );

  const linguisticDomains = compatibleDomains.filter(
    (domain) => getRequiredExpressionDomainFamily(domain) === "linguistic"
  );

  return {
    support,
    numericDomains,
    linguisticDomains,
  };
};

const normalizeDomainId = (value) => {
  const normalized = String(value || "").trim();
  return normalized.length > 0 && normalized !== "undefined" ? normalized : "";
};

const toLeafCriterionNames = (leafCriteria) =>
  (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion) => String(criterion?.name || "").trim())
    .filter(Boolean);

const toValidDomainIdSet = (domains) =>
  new Set(
    (Array.isArray(domains) ? domains : [])
      .map((domain) => normalizeDomainId(domain?._id || domain?.id))
      .filter(Boolean)
  );

export const resolveExpressionDomainOptions = (
  selectedModel,
  globalDomains = [],
  expressionDomains = []
) => {
  const { numericDomains, linguisticDomains } = getSupportedDomainPools(
    selectedModel,
    globalDomains,
    expressionDomains
  );

  const allDomains = [...numericDomains, ...linguisticDomains];
  const defaultDomainId =
    normalizeDomainId(
      numericDomains.find(
        (domain) => {
          const { min, max } = getExpressionDomainNumericRange(domain);
          return isNumericContinuousDomain(domain) && min === 0 && max === 1;
        }
      )?._id
    ) ||
    normalizeDomainId(
      numericDomains.find(
        (domain) => {
          const { min, max, step } = getExpressionDomainNumericRange(domain);
          return isNumericDiscreteDomain(domain) && min === 0 && max === 9 && step === 1;
        }
      )?._id
    ) ||
    normalizeDomainId(allDomains[0]?._id);

  return {
    allDomains,
    defaultDomainId,
    validDomainIdSet: toValidDomainIdSet(allDomains),
  };
};

export const getExpressionDomainAssignmentsByCriterion = ({
  expressionDomainConfig,
  leafCriteria,
}) => {
  const leafCriterionNames = toLeafCriterionNames(leafCriteria);
  const mode = String(expressionDomainConfig?.mode || "").trim();
  const assignments = {};

  if (mode === "global") {
    const globalDomainId = normalizeDomainId(expressionDomainConfig?.globalDomainId);
    leafCriterionNames.forEach((criterionName) => {
      assignments[criterionName] = globalDomainId;
    });
    return assignments;
  }

  const domainsByCriterion =
    expressionDomainConfig?.domainsByCriterion &&
    typeof expressionDomainConfig.domainsByCriterion === "object" &&
    !Array.isArray(expressionDomainConfig.domainsByCriterion)
      ? expressionDomainConfig.domainsByCriterion
      : {};

  leafCriterionNames.forEach((criterionName) => {
    assignments[criterionName] = normalizeDomainId(domainsByCriterion[criterionName]);
  });

  return assignments;
};

export const resolveAssignedDomainIdsFromExpressionDomainConfig = ({
  expressionDomainConfig,
  leafCriteria,
}) => {
  const assignments = getExpressionDomainAssignmentsByCriterion({
    expressionDomainConfig,
    leafCriteria,
  });

  return Array.from(
    new Set(Object.values(assignments).map((domainId) => normalizeDomainId(domainId)).filter(Boolean))
  );
};

export const validateExpressionDomainConfig = ({
  expressionDomainConfig,
  leafCriteria,
  validDomainIdSet = null,
}) => {
  if (!expressionDomainConfig || typeof expressionDomainConfig !== "object") {
    return false;
  }

  const leafCriterionNames = toLeafCriterionNames(leafCriteria);
  if (leafCriterionNames.length === 0) {
    return false;
  }

  const mode = String(expressionDomainConfig?.mode || "").trim();
  const validDomainIds = validDomainIdSet instanceof Set ? validDomainIdSet : null;

  if (mode === "global") {
    const globalDomainId = normalizeDomainId(expressionDomainConfig?.globalDomainId);
    if (!globalDomainId) return false;
    if (validDomainIds && !validDomainIds.has(globalDomainId)) return false;
    return true;
  }

  if (mode !== "byCriterion") {
    return false;
  }

  const domainsByCriterion =
    expressionDomainConfig?.domainsByCriterion &&
    typeof expressionDomainConfig.domainsByCriterion === "object" &&
    !Array.isArray(expressionDomainConfig.domainsByCriterion)
      ? expressionDomainConfig.domainsByCriterion
      : null;

  if (!domainsByCriterion) return false;

  const providedNames = Object.keys(domainsByCriterion);
  if (providedNames.length !== leafCriterionNames.length) return false;

  const leafNameSet = new Set(leafCriterionNames);
  for (const criterionName of providedNames) {
    if (!leafNameSet.has(criterionName)) return false;
    const domainId = normalizeDomainId(domainsByCriterion[criterionName]);
    if (!domainId) return false;
    if (validDomainIds && !validDomainIds.has(domainId)) return false;
  }

  return true;
};

export const buildInitialExpressionDomainConfig = ({
  selectedModel,
  leafCriteria,
  currentConfig,
  globalDomains = [],
  expressionDomains = [],
}) => {
  const leafCriterionNames = toLeafCriterionNames(leafCriteria);
  const { defaultDomainId, validDomainIdSet } = resolveExpressionDomainOptions(
    selectedModel,
    globalDomains,
    expressionDomains
  );

  const fallbackDomainId = defaultDomainId || "";
  const safeCurrent = currentConfig && typeof currentConfig === "object" ? currentConfig : {};
  const currentMode = String(safeCurrent.mode || "").trim();

  const normalizeDomainForLeaf = (domainId) => {
    const normalized = normalizeDomainId(domainId);
    if (!normalized) return fallbackDomainId;
    if (validDomainIdSet.size > 0 && !validDomainIdSet.has(normalized)) {
      return fallbackDomainId;
    }
    return normalized;
  };

  if (currentMode === "byCriterion") {
    const prevMap =
      safeCurrent.domainsByCriterion &&
      typeof safeCurrent.domainsByCriterion === "object" &&
      !Array.isArray(safeCurrent.domainsByCriterion)
        ? safeCurrent.domainsByCriterion
        : {};
    const domainsByCriterion = {};

    leafCriterionNames.forEach((criterionName) => {
      domainsByCriterion[criterionName] = normalizeDomainForLeaf(prevMap[criterionName]);
    });

    return {
      mode: "byCriterion",
      domainsByCriterion,
    };
  }

  return {
    mode: "global",
    globalDomainId: normalizeDomainForLeaf(safeCurrent.globalDomainId),
  };
};
