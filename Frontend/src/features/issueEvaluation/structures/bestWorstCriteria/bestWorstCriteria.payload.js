const isValidBwmScaleValue = (value) =>
  Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 9;

export const buildEmptyBestWorstCriteriaPayload = (criterionNames) => ({
  bestCriterion: criterionNames[0] || "",
  worstCriterion:
    criterionNames.length > 1
      ? criterionNames[criterionNames.length - 1]
      : criterionNames[0] || "",
  bestToOthers: Object.fromEntries(
    criterionNames.map((name) => [name, name === criterionNames[0] ? 1 : ""])
  ),
  othersToWorst: Object.fromEntries(
    criterionNames.map((name) => [
      name,
      name ===
      (criterionNames.length > 1
        ? criterionNames[criterionNames.length - 1]
        : criterionNames[0])
        ? 1
        : "",
    ])
  ),
});

export const validateBestWorstCriteriaPayload = ({ criterionNames, payload }) => {
  const names = criterionNames;
  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } = payload;

  if (!bestCriterion) return "Best criterion is required.";
  if (!worstCriterion) return "Worst criterion is required.";
  if (!names.includes(bestCriterion)) return "Best criterion is invalid.";
  if (!names.includes(worstCriterion)) return "Worst criterion is invalid.";
  if (names.length > 1 && bestCriterion === worstCriterion) {
    return "Best and worst criteria must be different.";
  }

  for (const name of names) {
    if (name !== bestCriterion && !isValidBwmScaleValue(bestToOthers[name])) {
      return `Best-to-others value for '${name}' must be an integer between 1 and 9.`;
    }

    if (name !== worstCriterion && !isValidBwmScaleValue(othersToWorst[name])) {
      return `Others-to-worst value for '${name}' must be an integer between 1 and 9.`;
    }
  }

  if (bestToOthers[bestCriterion] !== 1) {
    return "Best criterion self-comparison must be 1.";
  }

  if (othersToWorst[worstCriterion] !== 1) {
    return "Worst criterion self-comparison must be 1.";
  }

  return null;
};
