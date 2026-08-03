export const buildDefaultsResolved = ({ modelDoc, leafCount }) => {
  const resolved = {};
  const safeLeafCount = Number.isInteger(leafCount) && leafCount > 0 ? leafCount : 0;
  const modelParameters = modelDoc.parameters;

  for (const parameter of modelParameters) {
    const { default: defaultValue } = parameter;
    const name = typeof parameter?.key === "string" ? parameter.key.trim() : "";
    if (!name) continue;
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
