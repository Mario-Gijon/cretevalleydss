export const normalizeBestWorstScaleInput = (value) => {
  if (value === "") return "";
  if (/^[1-9]$/.test(value)) return Number(value);
  return null;
};

export const updateBestCriterionSelection = ({
  payload,
  criterionIds,
  bestCriterion,
}) => {
  const previousBestCriterion = payload.bestCriterion;
  const next = {
    ...payload,
    bestCriterion,
    bestToOthers: {
      ...payload.bestToOthers,
      [bestCriterion]: 1,
    },
    othersToWorst: { ...payload.othersToWorst },
  };

  if (
    previousBestCriterion &&
    previousBestCriterion !== bestCriterion &&
    next.bestToOthers[previousBestCriterion] === 1
  ) {
    next.bestToOthers[previousBestCriterion] = "";
  }

  if (criterionIds.length > 1 && next.worstCriterion === next.bestCriterion) {
    next.worstCriterion =
      criterionIds.find((criterionId) => criterionId !== next.bestCriterion) ||
      next.worstCriterion;
    next.othersToWorst[next.worstCriterion] = 1;
  }

  return next;
};

export const updateWorstCriterionSelection = ({
  payload,
  criterionIds,
  worstCriterion,
}) => {
  const previousWorstCriterion = payload.worstCriterion;
  const next = {
    ...payload,
    worstCriterion,
    bestToOthers: { ...payload.bestToOthers },
    othersToWorst: {
      ...payload.othersToWorst,
      [worstCriterion]: 1,
    },
  };

  if (
    previousWorstCriterion &&
    previousWorstCriterion !== worstCriterion &&
    next.othersToWorst[previousWorstCriterion] === 1
  ) {
    next.othersToWorst[previousWorstCriterion] = "";
  }

  if (criterionIds.length > 1 && next.bestCriterion === next.worstCriterion) {
    next.bestCriterion =
      criterionIds.find((criterionId) => criterionId !== next.worstCriterion) ||
      next.bestCriterion;
    next.bestToOthers[next.bestCriterion] = 1;
  }

  return next;
};

export const updateBestWorstComparison = ({
  payload,
  comparisonKey,
  criterionId,
  rawValue,
}) => {
  const normalizedValue = normalizeBestWorstScaleInput(rawValue);

  if (normalizedValue === null) {
    return payload;
  }

  return {
    ...payload,
    [comparisonKey]: {
      ...payload[comparisonKey],
      [criterionId]: normalizedValue,
    },
  };
};
