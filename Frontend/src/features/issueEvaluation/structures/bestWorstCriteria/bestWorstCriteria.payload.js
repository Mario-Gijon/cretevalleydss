const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isValidBwmScaleValue = (value) =>
  Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 9;

export const buildEmptyBestWorstCriteriaPayload = (criterionNames) => ({
  bestCriterion: "",
  worstCriterion: "",
  bestToOthers: Object.fromEntries(
    (Array.isArray(criterionNames) ? criterionNames : []).map((name) => [
      name,
      "",
    ])
  ),
  othersToWorst: Object.fromEntries(
    (Array.isArray(criterionNames) ? criterionNames : []).map((name) => [
      name,
      "",
    ])
  ),
});

export const normalizeBestWorstCriteriaDraftPayload = ({
  criterionNames,
  payload,
}) => {
  const names = (Array.isArray(criterionNames) ? criterionNames : []).filter(
    Boolean
  );
  const safePayload = isPlainObject(payload) ? payload : {};
  const base = buildEmptyBestWorstCriteriaPayload(names);

  const normalized = {
    bestCriterion:
      typeof safePayload.bestCriterion === "string" &&
      names.includes(safePayload.bestCriterion)
        ? safePayload.bestCriterion
        : names[0] || "",
    worstCriterion:
      typeof safePayload.worstCriterion === "string" &&
      names.includes(safePayload.worstCriterion)
        ? safePayload.worstCriterion
        : names.length > 1
          ? names[names.length - 1]
          : names[0] || "",
    bestToOthers: { ...base.bestToOthers },
    othersToWorst: { ...base.othersToWorst },
  };

  if (
    names.length > 1 &&
    normalized.bestCriterion === normalized.worstCriterion
  ) {
    normalized.worstCriterion =
      names.find((name) => name !== normalized.bestCriterion) ||
      normalized.worstCriterion;
  }

  for (const name of names) {
    const bestValue = safePayload?.bestToOthers?.[name];
    const worstValue = safePayload?.othersToWorst?.[name];

    normalized.bestToOthers[name] =
      bestValue === "" || bestValue === null || bestValue === undefined
        ? ""
        : Number(bestValue);

    normalized.othersToWorst[name] =
      worstValue === "" || worstValue === null || worstValue === undefined
        ? ""
        : Number(worstValue);
  }

  if (normalized.bestCriterion) {
    normalized.bestToOthers[normalized.bestCriterion] = 1;
  }

  if (normalized.worstCriterion) {
    normalized.othersToWorst[normalized.worstCriterion] = 1;
  }

  return normalized;
};

export const validateBestWorstCriteriaPayload = ({ criterionNames, payload }) => {
  const names = (Array.isArray(criterionNames) ? criterionNames : []).filter(
    Boolean
  );
  const normalized = normalizeBestWorstCriteriaDraftPayload({
    criterionNames: names,
    payload,
  });

  const { bestCriterion, worstCriterion, bestToOthers, othersToWorst } =
    normalized;

  if (!bestCriterion) return "Best criterion is required.";
  if (!worstCriterion) return "Worst criterion is required.";
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

  return null;
};
