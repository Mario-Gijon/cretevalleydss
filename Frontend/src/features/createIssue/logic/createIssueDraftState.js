import { isPlainObject } from "../../../utils/common/objects";
import dayjs from "dayjs";

export const CREATE_ISSUE_DRAFT_VERSION = 1;

const EMPTY_EXPRESSION_DOMAIN_CONFIG = {
  mode: "global",
  globalDomainId: "",
};

const hasStableModelIdentity = (model) =>
  isPlainObject(model) &&
  [model._id, model.id, model.apiModelKey].some(
    (value) => typeof value === "string" && value.trim() !== ""
  );

const removeStoredCreateIssueData = (storageKey) => {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Storage can be unavailable or read-only; the draft is already unusable.
  }
};

const normalizeCurrentCreateIssueDraft = (draft) => {
  if (
    !isPlainObject(draft) ||
    draft.draftVersion !== CREATE_ISSUE_DRAFT_VERSION ||
    (draft.selectedModel !== null &&
      draft.selectedModel !== undefined &&
      !hasStableModelIdentity(draft.selectedModel))
  ) {
    return null;
  }

  return {
    draftVersion: CREATE_ISSUE_DRAFT_VERSION,
    activeStep:
      Number.isInteger(draft.activeStep) && draft.activeStep >= 0
        ? draft.activeStep
        : 0,
    completed: isPlainObject(draft.completed) ? draft.completed : {},
    selectedModel: draft.selectedModel || null,
    showConsensusModels: draft.showConsensusModels === true,
    isConsensus: draft.isConsensus === true,
    alternatives: Array.isArray(draft.alternatives) ? draft.alternatives : [],
    criteria: Array.isArray(draft.criteria) ? draft.criteria : [],
    addedExperts: Array.isArray(draft.addedExperts)
      ? draft.addedExperts.filter((expert) => typeof expert === "string")
      : [],
    expertWeights: isPlainObject(draft.expertWeights)
      ? draft.expertWeights
      : null,
    expertWeightsCustomized: draft.expertWeightsCustomized === true,
    issueName: typeof draft.issueName === "string" ? draft.issueName : "",
    issueDescription:
      typeof draft.issueDescription === "string" ? draft.issueDescription : "",
    expressionDomainConfig: isPlainObject(draft.expressionDomainConfig)
      ? draft.expressionDomainConfig
      : { ...EMPTY_EXPRESSION_DOMAIN_CONFIG },
    paramValues: isPlainObject(draft.paramValues) ? draft.paramValues : {},
    criteriaWeightingConfig: isPlainObject(draft.criteriaWeightingConfig)
      ? draft.criteriaWeightingConfig
      : null,
    closureDate:
      typeof draft.closureDate === "string" || draft.closureDate === null
        ? draft.closureDate
        : null,
    ...(Object.hasOwn(draft, "consensusMaxPhases")
      ? { consensusMaxPhases: draft.consensusMaxPhases }
      : {}),
    ...(Object.hasOwn(draft, "consensusThreshold")
      ? { consensusThreshold: draft.consensusThreshold }
      : {}),
    simulateConsensus: draft.simulateConsensus === true,
  };
};

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
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    const normalized = normalizeCurrentCreateIssueDraft(parsed);

    if (!normalized) {
      removeStoredCreateIssueData(storageKey);
    }

    return normalized || {};
  } catch {
    removeStoredCreateIssueData(storageKey);
    return {};
  }
};

export const persistStoredCreateIssueData = (storageKey, data) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...data,
        draftVersion: CREATE_ISSUE_DRAFT_VERSION,
      })
    );
  } catch {
    // A storage failure should not prevent the Create Issue flow from working.
  }
};

export const clearStoredCreateIssueData = (storageKey) => {
  if (typeof window === "undefined") return;

  removeStoredCreateIssueData(storageKey);
};

export const resolveInitialConsensusMaxPhases = (storedData) => {
  if (Object.hasOwn(storedData, "consensusMaxPhases") && storedData.consensusMaxPhases === null) {
    return null;
  }

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

export const resolveInitialClosureDate = (storedData) => {
  const storedClosureDate = storedData?.closureDate;
  if (!storedClosureDate) {
    return null;
  }

  const closureDate = dayjs(storedClosureDate);

  return closureDate.isValid() ? closureDate : null;
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
  expertWeights,
  expertWeightsCustomized,
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
  draftVersion: CREATE_ISSUE_DRAFT_VERSION,
  activeStep,
  completed,
  selectedModel,
  showConsensusModels,
  isConsensus: effectiveIsConsensus,
  alternatives,
  criteria,
  addedExperts,
  ...(expertWeights ? { expertWeights } : {}),
  ...(expertWeightsCustomized === true ? { expertWeightsCustomized: true } : {}),
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
