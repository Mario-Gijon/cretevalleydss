import {
  CRITERIA_WEIGHTING_MODES,
} from "./createIssueCriteriaWeightingModes";
import {
  isDeepEqual,
  isPlainObject,
  buildDefaultFuzzyWeightVector,
  buildEqualWeightsByCriterion,
} from "./createIssueCriteriaWeightValues";
import { resolveAssignedDomainIds } from "./createIssueAssignedDomains";

export const CREATE_ISSUE_CRITERIA_WEIGHTING_MODES = CRITERIA_WEIGHTING_MODES;
export const isCreateIssueDeepEqual = isDeepEqual;
export const modelUsesCriteriaWeights = (model) =>
  model?.usesCriteriaWeights === true;

export const isFuzzyCriteriaWeightModel = (model) =>
  modelUsesCriteriaWeights(model) && model?.usesFuzzyCriteriaWeights === true;

export const buildCreateIssueEqualManualWeights = (leafCriteria) =>
  buildEqualWeightsByCriterion(leafCriteria);

export const buildDefaultCriteriaWeightingConfig = (selectedModel) => {
  if (!modelUsesCriteriaWeights(selectedModel)) {
    return null;
  }

  if (isFuzzyCriteriaWeightModel(selectedModel)) {
    return {
      mode: "creatorFuzzy",
      source: "creator",
      method: "fuzzy",
      structureKey: null,
      payload: {},
    };
  }

  return {
    mode: "expertManual",
    source: "experts",
    method: "manual",
    structureKey: "manualCriteriaWeights",
    payload: {},
  };
};

export const resolveFuzzyCriteriaWeightValueCount = (domains = []) => {
  const linguisticDomains = (Array.isArray(domains) ? domains : []).filter(
    (domain) => domain?.type === "linguistic"
  );
  const valueCounts = Array.from(
    new Set(
      linguisticDomains
        .map((domain) => Number(domain?.valueCount))
        .filter((valueCount) => Number.isInteger(valueCount) && valueCount >= 2)
    )
  );

  return valueCounts.length === 1 ? valueCounts[0] : null;
};

const buildDefaultFuzzyWeightsByCriterion = ({
  leafCriteria,
  fuzzyValueCount,
}) => {
  const criterionIds = (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion) => criterion?.id)
    .filter(Boolean);
  if (
    !Number.isInteger(fuzzyValueCount) ||
    fuzzyValueCount < 2 ||
    criterionIds.length === 0
  ) {
    return {};
  }

  const isSingleCriterion = criterionIds.length === 1;
  const baseVector = isSingleCriterion
    ? Array.from({ length: fuzzyValueCount }, () => 1)
    : buildDefaultFuzzyWeightVector(fuzzyValueCount);

  return criterionIds.reduce((accumulator, criterionId) => {
    accumulator[criterionId] = [...baseVector];
    return accumulator;
  }, {});
};

export const isCreateIssueCriteriaWeightingConfigOnDefault = ({
  selectedModel,
  criteriaWeightingConfig,
  leafCriteria,
  fuzzyValueCount,
}) => {
  const expectedDefault = buildDefaultCriteriaWeightingConfig(
    selectedModel,
    leafCriteria
  );
  if (!modelUsesCriteriaWeights(selectedModel)) {
    return criteriaWeightingConfig == null;
  }
  if (!isPlainObject(criteriaWeightingConfig) || !isPlainObject(expectedDefault)) {
    return false;
  }

  if (!isFuzzyCriteriaWeightModel(selectedModel)) {
    const criterionIds = (Array.isArray(leafCriteria) ? leafCriteria : [])
      .map((criterion) => criterion?.id)
      .filter(Boolean);

    if (criterionIds.length === 1) {
      const onlyLeafId = criterionIds[0];
      const isCreatorManualForSingleLeaf =
        criteriaWeightingConfig.mode ===
          CREATE_ISSUE_CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL &&
        criteriaWeightingConfig.source === "creator" &&
        criteriaWeightingConfig.method === "manual" &&
        criteriaWeightingConfig.structureKey === "manualCriteriaWeights" &&
        (
          isDeepEqual(
            criteriaWeightingConfig?.payload?.weightsByCriterion || {},
            {}
          ) ||
          isDeepEqual(
            criteriaWeightingConfig?.payload?.weightsByCriterion || {},
            { [onlyLeafId]: 1 }
          )
        );

      if (isCreatorManualForSingleLeaf) {
        return true;
      }
    }

    return isDeepEqual(criteriaWeightingConfig, expectedDefault);
  }

  const expectedFuzzyWeights = buildDefaultFuzzyWeightsByCriterion({
    leafCriteria,
    fuzzyValueCount,
  });
  const currentFuzzyWeights = criteriaWeightingConfig?.payload?.weightsByCriterion;
  const fuzzyWeightsOnDefault =
    isDeepEqual(currentFuzzyWeights || {}, {}) ||
    isDeepEqual(currentFuzzyWeights || {}, expectedFuzzyWeights);

  return (
    criteriaWeightingConfig.mode === expectedDefault.mode &&
    criteriaWeightingConfig.source === expectedDefault.source &&
    criteriaWeightingConfig.method === expectedDefault.method &&
    criteriaWeightingConfig.structureKey === expectedDefault.structureKey &&
    fuzzyWeightsOnDefault
  );
};

export const resolveAssignedFuzzyValueCount = ({
  expressionDomainConfig,
  leafCriteria,
  globalDomains,
  expressionDomains,
}) => {
  const assignedDomainIds = resolveAssignedDomainIds({
    expressionDomainConfig,
    leafCriteria,
  });

  if (!assignedDomainIds.length) {
    return null;
  }

  const domainDocs = [
    ...(Array.isArray(globalDomains) ? globalDomains : []),
    ...(Array.isArray(expressionDomains) ? expressionDomains : []),
  ];
  const domainById = new Map(
    domainDocs
      .map((domain) => [String(domain?.id || domain?._id || "").trim(), domain])
      .filter(([id]) => id.length > 0)
  );

  const valueCounts = new Set();
  for (const domainId of assignedDomainIds) {
    const domain = domainById.get(domainId);
    if (domain?.type !== "linguistic") continue;

    const valueCount = Number(domain?.valueCount);
    if (!Number.isInteger(valueCount) || valueCount < 2) {
      return null;
    }

    valueCounts.add(valueCount);
  }

  return valueCounts.size === 1 ? Array.from(valueCounts)[0] : null;
};

export const validateCreateIssueManualCriteriaWeighting = ({
  criteriaWeightingConfig,
  leafCriteria,
}) => {
  const payload = criteriaWeightingConfig?.payload;
  const weightsByCriterion = payload?.weightsByCriterion;

  if (!isPlainObject(weightsByCriterion)) {
    return "Manual mode requires weights by criterion.";
  }

  const criterionItems = leafCriteria
    .map((criterion) => ({
      id: criterion?.id,
      name: criterion?.name,
    }))
    .filter((criterion) => criterion.id && criterion.name);
  const expectedKeySet = new Set(criterionItems.map((criterion) => criterion.id));

  const unknownKeys = Object.keys(weightsByCriterion).filter(
    (criterionId) => !expectedKeySet.has(criterionId)
  );
  if (unknownKeys.length > 0) {
    return `Unknown criteria in manual weights: ${unknownKeys.join(", ")}`;
  }

  const weights = criterionItems.map((criterion) =>
    Number(weightsByCriterion[criterion.id])
  );

  if (weights.some((value) => !Number.isFinite(value))) {
    return "Manual mode requires numeric weights for all criteria.";
  }

  if (weights.some((value) => value < 0 || value > 1)) {
    return "Manual weights must be between 0 and 1.";
  }

  const total = weights.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > 0.001) {
    return "Manual weights must sum to 1.";
  }

  return null;
};

export const validateCreateIssueFuzzyCriteriaWeighting = ({
  criteriaWeightingConfig,
  leafCriteria,
  fuzzyValueCount,
}) => {
  const payload = criteriaWeightingConfig?.payload;
  const weightsByCriterion = payload?.weightsByCriterion;

  if (!isPlainObject(weightsByCriterion)) {
    return "Fuzzy criteria weights are required.";
  }

  const criterionItems = leafCriteria
    .map((criterion) => ({
      id: criterion?.id,
      name: criterion?.name,
    }))
    .filter((criterion) => criterion.id && criterion.name);
  const expectedKeySet = new Set(criterionItems.map((criterion) => criterion.id));

  const unknownKeys = Object.keys(weightsByCriterion).filter(
    (criterionId) => !expectedKeySet.has(criterionId)
  );
  if (unknownKeys.length > 0) {
    return `Unknown criteria in fuzzy weights: ${unknownKeys.join(", ")}`;
  }
  if (!Number.isInteger(fuzzyValueCount) || fuzzyValueCount < 2) {
    return "Fuzzy criteria weights require a consistent linguistic value count.";
  }

  for (const criterion of criterionItems) {
    const vector = weightsByCriterion[criterion.id];
    if (!Array.isArray(vector) || vector.length !== fuzzyValueCount) {
      return `Fuzzy weight for '${criterion.name}' must contain ${fuzzyValueCount} values.`;
    }

    const numericVector = vector.map(Number);
    if (numericVector.some((item) => !Number.isFinite(item))) {
      return `Fuzzy weight for '${criterion.name}' must contain valid numbers.`;
    }

    if (numericVector.some((item) => item < 0 || item > 1)) {
      return `Fuzzy weight for '${criterion.name}' must stay within [0, 1].`;
    }

    for (let index = 1; index < numericVector.length; index += 1) {
      if (numericVector[index] < numericVector[index - 1]) {
        return `Fuzzy weight for '${criterion.name}' must be non-decreasing.`;
      }
    }
  }

  return null;
};
