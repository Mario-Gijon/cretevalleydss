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

export const buildDefaultFuzzyWeightVector = (valueCount) => {
  if (!Number.isInteger(valueCount) || valueCount <= 1) {
    return [];
  }

  const min = 0.25;
  const max = 0.75;
  const step = (max - min) / (valueCount - 1);

  return Array.from({ length: valueCount }, (_, index) =>
    Number((min + step * index).toFixed(10))
  );
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

export const formatDisplayNumber = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(2);
};

export const buildEqualValues = ({ count, total }) => {
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
