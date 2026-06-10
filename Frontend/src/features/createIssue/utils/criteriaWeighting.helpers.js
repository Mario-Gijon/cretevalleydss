import { buildDefaultFuzzyWeightVector } from "../logic/createIssueCriteriaWeighting";

export const CRITERIA_WEIGHTING_MODES = Object.freeze({
  CREATOR_FUZZY: "creatorFuzzy",
  CREATOR_MANUAL: "creatorManual",
  EXPERT_MANUAL: "expertManual",
  CREATOR_API_MODEL: "creatorApiModel",
  EXPERT_API_MODEL: "expertApiModel",
});

export const normalizeMode = (mode) =>
  typeof mode === "string" && mode.trim()
    ? mode.trim()
    : CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL;

export const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isDeepEqual = (left, right) => {
  if (left === right) return true;

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => isDeepEqual(item, right[index]));
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => isDeepEqual(left[key], right[key]));
  }

  return false;
};

export const buildEqualWeightsByCriterion = (leafCriteria) => {
  const criterionNames = (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion) => criterion?.name)
    .filter(Boolean);

  if (criterionNames.length === 0) {
    return {};
  }

  const baseWeight = Number((1 / criterionNames.length).toFixed(6));
  const weightsByCriterion = {};

  let consumed = 0;
  criterionNames.forEach((criterionName, index) => {
    if (index === criterionNames.length - 1) {
      weightsByCriterion[criterionName] = Number((1 - consumed).toFixed(6));
      return;
    }

    weightsByCriterion[criterionName] = baseWeight;
    consumed += baseWeight;
  });

  return weightsByCriterion;
};

export const buildConfigByMode = ({ mode, leafCriteria }) => {
  const resolvedMode = normalizeMode(mode);

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY) {
    return {
      mode: resolvedMode,
      source: "creator",
      method: "fuzzy",
      structureKey: null,
      payload: {},
    };
  }

  if (resolvedMode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL) {
    return {
      mode: resolvedMode,
      source: "creator",
      method: "manual",
      structureKey: "manualCriteriaWeights",
      payload: {
        weightsByCriterion: buildEqualWeightsByCriterion(leafCriteria),
      },
    };
  }

  return {
    mode: CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
    source: "experts",
    method: "manual",
    structureKey: "manualCriteriaWeights",
    payload: {},
  };
};

export const buildApiCriteriaWeightingConfig = ({
  mode,
  leafCriteria,
  criteriaWeightingModel,
}) => {
  void leafCriteria;
  const isCreatorMode = mode === CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL;
  const structureKey = String(
    criteriaWeightingModel?.criteriaWeightingStructureKey || ""
  ).trim();
  const modelId = String(criteriaWeightingModel?._id || criteriaWeightingModel?.id || "").trim();
  const modelKey = String(criteriaWeightingModel?.apiModelKey || "").trim();

  return {
    mode: isCreatorMode
      ? CRITERIA_WEIGHTING_MODES.CREATOR_API_MODEL
      : CRITERIA_WEIGHTING_MODES.EXPERT_API_MODEL,
    source: isCreatorMode ? "creator" : "experts",
    method: "apiModel",
    structureKey: structureKey || null,
    criteriaWeightingModelId: modelId || null,
    criteriaWeightingModelKey: modelKey || null,
    criteriaWeightingParameters: {},
    payload: {},
  };
};

export const formatDisplayNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(2);
};

export const resolveAssignedDomainIds = ({
  expressionDomainConfig,
  leafCriteria,
}) => {
  const mode = String(expressionDomainConfig?.mode || "").trim();
  const leafNames = (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion) => String(criterion?.name || "").trim())
    .filter(Boolean);
  const domainIds = new Set();

  if (mode === "global") {
    const globalDomainId = String(expressionDomainConfig?.globalDomainId || "").trim();
    if (globalDomainId) {
      domainIds.add(globalDomainId);
    }
    return Array.from(domainIds);
  }

  if (mode !== "byCriterion") {
    return [];
  }

  const domainsByCriterion =
    expressionDomainConfig?.domainsByCriterion &&
    typeof expressionDomainConfig.domainsByCriterion === "object" &&
    !Array.isArray(expressionDomainConfig.domainsByCriterion)
      ? expressionDomainConfig.domainsByCriterion
      : {};

  for (const criterionName of leafNames) {
    const domainId = String(domainsByCriterion[criterionName] || "").trim();
    if (domainId) {
      domainIds.add(domainId);
    }
  }

  return Array.from(domainIds);
};

export const collectLeafCriteriaByRoot = (criteria) => {
  const byRoot = {};

  const collectLeaves = (nodes = [], rootName) => {
    for (const node of nodes) {
      const children = Array.isArray(node?.children) ? node.children : [];
      if (children.length === 0) {
        if (!byRoot[rootName]) byRoot[rootName] = [];
        byRoot[rootName].push(node);
        continue;
      }

      collectLeaves(children, rootName);
    }
  };

  for (const rootCriterion of Array.isArray(criteria) ? criteria : []) {
    const rootName = rootCriterion?.name;
    if (!rootName) continue;
    collectLeaves([rootCriterion], rootName);
  }

  return byRoot;
};

const buildEqualValues = ({ count, total }) => {
  if (!Number.isInteger(count) || count <= 0) return [];
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 1;
  const base = Number((safeTotal / count).toFixed(6));
  const values = Array.from({ length: count }, () => base);
  values[count - 1] = Number((safeTotal - base * (count - 1)).toFixed(6));
  return values;
};

export const normalizeManualWeightsByRoot = ({
  sourceWeights,
  leafByRoot,
  totalLeafCount,
}) => {
  const source = isPlainObject(sourceWeights) ? sourceWeights : {};
  const normalized = {};

  const rootEntries = Object.entries(leafByRoot || {});
  for (const [rootName, leaves] of rootEntries) {
    const leafNames = leaves.map((criterion) => criterion?.name).filter(Boolean);
    if (leafNames.length === 0) continue;

    if (totalLeafCount === 1) {
      normalized[leafNames[0]] = 1;
      continue;
    }

    const hasAllCurrentLeafKeys = leafNames.every((leafName) =>
      Object.prototype.hasOwnProperty.call(source, leafName)
    );

    if (hasAllCurrentLeafKeys) {
      leafNames.forEach((leafName) => {
        normalized[leafName] = source[leafName];
      });
      continue;
    }

    const branchBudgetFromCurrentLeaves = leafNames.reduce((sum, leafName) => {
      const value = Number(source[leafName]);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);

    const previousRootValue = Number(source[rootName]);
    const fallbackBudget =
      Number.isFinite(branchBudgetFromCurrentLeaves) && branchBudgetFromCurrentLeaves > 0
        ? branchBudgetFromCurrentLeaves
        : Number.isFinite(previousRootValue) && previousRootValue > 0
          ? previousRootValue
          : (1 / Math.max(totalLeafCount, 1)) * leafNames.length;

    const branchDefaults = buildEqualValues({
      count: leafNames.length,
      total: fallbackBudget,
    });

    leafNames.forEach((leafName, index) => {
      normalized[leafName] = branchDefaults[index];
    });
  }

  return normalized;
};

export const normalizeFuzzyWeightsByRoot = ({
  sourceWeights,
  leafByRoot,
  fuzzyValueCount,
  totalLeafCount,
}) => {
  if (!Number.isInteger(fuzzyValueCount) || fuzzyValueCount < 2) {
    return {};
  }

  const source = isPlainObject(sourceWeights) ? sourceWeights : {};
  const normalized = {};
  const rootEntries = Object.entries(leafByRoot || {});

  for (const [rootName, leaves] of rootEntries) {
    const leafNames = leaves.map((criterion) => criterion?.name).filter(Boolean);
    if (leafNames.length === 0) continue;

    const defaultVector =
      totalLeafCount === 1
        ? Array.from({ length: fuzzyValueCount }, () => 1)
        : buildDefaultFuzzyWeightVector(fuzzyValueCount);

    const hasAllValid = leafNames.every((leafName) => {
      const vector = source[leafName];
      return (
        Array.isArray(vector) &&
        vector.length === fuzzyValueCount &&
        vector.every((item) => Number.isFinite(Number(item)))
      );
    });

    leafNames.forEach((leafName) => {
      const vector = source[leafName];
      normalized[leafName] = hasAllValid
        ? vector.map(Number)
        : [...defaultVector];
    });

    const staleRootVector = source[rootName];
    const hasFiniteStaleRootVector =
      Array.isArray(staleRootVector) &&
      staleRootVector.length === fuzzyValueCount &&
      staleRootVector.every((item) => Number.isFinite(Number(item)));
    if (!hasAllValid && hasFiniteStaleRootVector) {
      leafNames.forEach((leafName) => {
        normalized[leafName] = staleRootVector.map(Number);
      });
    }
  }

  return normalized;
};
