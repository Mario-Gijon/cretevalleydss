import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

const ensureLen = (arr, len, filler = null) => {
  const normalized = [...arr];

  if (normalized.length < len) {
    return [...normalized, ...Array(len - normalized.length).fill(filler)];
  }

  if (normalized.length > len) {
    return normalized.slice(0, len);
  }

  return normalized;
};

export const buildDefaultsResolved = ({ modelDoc, leafCount }) => {
  const resolved = {};
  const safeLeafCount = Number.isInteger(leafCount) && leafCount > 0 ? leafCount : 0;
  const modelParameters = modelDoc.parameters;

  for (const parameter of modelParameters) {
    const { default: defaultValue } = parameter;
    const parameterStructureKey = normalizeNonEmptyString(
      parameter?.parameterStructureKey
    );
    const name = normalizeNonEmptyString(parameter.key);
    if (!name) continue;

    if (
      parameterStructureKey === "numberGlobal" ||
      parameterStructureKey === "selectGlobal" ||
      parameterStructureKey === "numberCriterion" ||
      parameterStructureKey === "selectCriterion"
    ) {
      resolved[name] = defaultValue;
      continue;
    }

    if (parameterStructureKey === "intervalGlobal") {
      const fixedLength = parameter.restrictions?.length ?? null;
      const length =
        fixedLength ??
        (Array.isArray(defaultValue) ? defaultValue.length || 2 : 2);

      const isCriteriaWeights =
        normalizeNonEmptyString(parameter.semanticRole) === "criteriaWeights";

      if (
        isCriteriaWeights &&
        typeof defaultValue === "string" &&
        defaultValue.trim().toLowerCase() === "equal" &&
        safeLeafCount > 0
      ) {
        const equalWeights = Array.from({ length: safeLeafCount }, () => 1 / safeLeafCount);
        resolved[name] = ensureLen(equalWeights, length, null);
        continue;
      }

      const base = defaultValue;
      resolved[name] = ensureLen(base, length, null);
      continue;
    }

    resolved[name] = defaultValue;
  }

  if (modelDoc.usesCriteriaWeights === true && safeLeafCount > 0) {
    if (modelDoc.usesFuzzyCriteriaWeights === true) {
      const fuzzyValueCount = modelDoc.fuzzyWeightsValueCount;
      if (Number.isInteger(fuzzyValueCount) && fuzzyValueCount >= 2) {
        if (safeLeafCount === 1) {
          resolved.weights = [Array.from({ length: fuzzyValueCount }, () => 1)];
        } else {
          resolved.weights = Array.from({ length: safeLeafCount }, () =>
            Array.from({ length: fuzzyValueCount }, () => "")
          );
        }
      }
    } else {
      if (safeLeafCount === 1) {
        resolved.weights = [1];
      } else {
        const equalWeight = 1 / safeLeafCount;
        resolved.weights = Array.from({ length: safeLeafCount }, () => equalWeight);
      }
    }
  }

  return resolved;
};

export const mergeParamsResolved = ({ defaultsResolved, savedParams }) => {
  const merged = { ...defaultsResolved };

  for (const [key, value] of Object.entries(savedParams)) {
    merged[key] = value;
  }

  return merged;
};
