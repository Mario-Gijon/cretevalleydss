export const modelUsesCriteriaWeights = (model) =>
  model?.usesCriteriaWeights === true;

export const isFuzzyCriteriaWeightModel = (model) =>
  modelUsesCriteriaWeights(model) && model?.usesFuzzyCriteriaWeights === true;

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
