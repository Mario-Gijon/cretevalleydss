export const isFuzzyCriteriaWeightModel = (model) => {
  const apiModelKey = String(model?.apiModelKey || "").trim().toLowerCase();
  if (apiModelKey === "fuzzy_topsis") {
    return true;
  }

  const criteriaWeightParameter = (Array.isArray(model?.parameters)
    ? model.parameters
    : []
  ).find((parameter) => parameter?.semanticRole === "criteriaWeights");

  return criteriaWeightParameter?.type === "fuzzyArray";
};

export const resolveFuzzyCriteriaWeightValueCount = (model) => {
  const criteriaWeightParameter = (Array.isArray(model?.parameters)
    ? model.parameters
    : []
  ).find((parameter) => parameter?.semanticRole === "criteriaWeights");

  const restrictionsLength = Number(criteriaWeightParameter?.restrictions?.length);
  if (Number.isInteger(restrictionsLength) && restrictionsLength >= 2) {
    return restrictionsLength;
  }

  const explicitCount = Number(criteriaWeightParameter?.valueCount);
  if (Number.isInteger(explicitCount) && explicitCount >= 2) {
    return explicitCount;
  }

  return 3;
};

export const buildDefaultFuzzyWeightVector = (valueCount) => {
  if (!Number.isInteger(valueCount) || valueCount <= 1) {
    return [0.25, 0.5, 0.75];
  }

  const min = 0.25;
  const max = 0.75;
  const step = (max - min) / (valueCount - 1);

  return Array.from({ length: valueCount }, (_, index) =>
    Number((min + step * index).toFixed(10))
  );
};

