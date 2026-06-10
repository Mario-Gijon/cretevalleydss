const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const normalizeStoredConsensusThreshold = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const normalizeStoredConsensusMaxPhases = (value) => {
  if (value === null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  return null;
};

export const readStoredCreateIssueData = (storageKey) => {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : {};

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
};

export const persistStoredCreateIssueData = (storageKey, data) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(storageKey, JSON.stringify(data));
};

export const resolveInitialConsensusMaxPhases = (storedData) => {
  const storedConsensusMaxPhases = normalizeStoredConsensusMaxPhases(
    storedData.consensusMaxPhases
  );

  return storedConsensusMaxPhases === null || storedConsensusMaxPhases > 0
    ? storedConsensusMaxPhases ?? 3
    : 3;
};

export const resolveInitialConsensusThreshold = (storedData) => {
  const storedConsensusThreshold = normalizeStoredConsensusThreshold(
    storedData.consensusThreshold
  );

  return storedConsensusThreshold !== null ? storedConsensusThreshold : 0.7;
};

export const resolveInitialExpressionDomainConfig = (storedData) =>
  isPlainObject(storedData.expressionDomainConfig)
    ? storedData.expressionDomainConfig
    : {
      mode: "global",
      globalDomainId: "",
    };

export const resolveInitialCriteriaWeightingConfig = ({
  storedData,
  fallbackConfig,
}) =>
  isPlainObject(storedData.criteriaWeightingConfig)
    ? storedData.criteriaWeightingConfig
    : fallbackConfig;

export const buildStoredCreateIssueData = ({
  activeStep,
  completed,
  selectedModel,
  showConsensusModels,
  effectiveIsConsensus,
  alternatives,
  criteria,
  addedExperts,
  issueName,
  issueDescription,
  expressionDomainConfig,
  paramValues,
  criteriaWeightingConfig,
  closureDate,
  consensusMaxPhases,
  consensusThreshold,
  simulateConsensus,
}) => ({
  activeStep,
  completed,
  selectedModel,
  showConsensusModels,
  isConsensus: effectiveIsConsensus,
  alternatives,
  criteria,
  addedExperts,
  issueName,
  issueDescription,
  expressionDomainConfig,
  paramValues,
  criteriaWeightingConfig,
  closureDate: closureDate ? closureDate.toJSON() : null,
  ...(effectiveIsConsensus && {
    consensusMaxPhases,
    consensusThreshold,
  }),
  simulateConsensus,
});
