const finite = (value) => typeof value === "number" && Number.isFinite(value);
const idKey = (value) => {
  if (typeof value === "string" && value.trim()) return `string:${value}`;
  if (typeof value === "number" && Number.isFinite(value)) return `number:${value}`;
  return null;
};
const pairKey = (left, right) => [left, right].sort().join("\u0000");

/** Adapt generic pair facts to the existing model-independent heatmap contract. */
export const buildAlternativeRelationshipsHeatmap = (phase) => {
  const sourceAlternatives = Array.isArray(phase?.alternatives)
    ? phase.alternatives
    : [];
  if (sourceAlternatives.length < 2) return null;

  const alternatives = [];
  const alternativeKeys = new Set();
  for (const alternative of sourceAlternatives) {
    const key = idKey(alternative?.alternativeId);
    const name = typeof alternative?.name === "string" ? alternative.name.trim() : "";
    if (!key || !name || alternativeKeys.has(key)) return null;
    alternativeKeys.add(key);
    alternatives.push({ key, label: name });
  }

  const pairValues = new Map();
  const conflictingPairs = new Set();
  for (const pair of Array.isArray(phase?.pairs) ? phase.pairs : []) {
    const left = idKey(pair?.leftAlternativeId);
    const right = idKey(pair?.rightAlternativeId);
    const value = pair?.relativeSeparation;
    if (
      !left ||
      !right ||
      left === right ||
      !alternativeKeys.has(left) ||
      !alternativeKeys.has(right) ||
      !finite(value) ||
      value < 0 ||
      value > 1
    ) {
      continue;
    }

    const key = pairKey(left, right);
    if (pairValues.has(key) && pairValues.get(key) !== value) {
      pairValues.delete(key);
      conflictingPairs.add(key);
    } else if (!conflictingPairs.has(key)) {
      pairValues.set(key, value);
    }
  }

  const expectedPairCount = (alternatives.length * (alternatives.length - 1)) / 2;
  if (pairValues.size === 0) return null;

  const values = alternatives.map((row) =>
    alternatives.map((column) => {
      if (row.key === column.key) return null;
      return pairValues.get(pairKey(row.key, column.key)) ?? null;
    }),
  );
  const details = alternatives.map((row) =>
    alternatives.map((column) => {
      if (row.key === column.key) {
        return { note: "Same alternative; no pairwise comparison." };
      }
      return pairValues.has(pairKey(row.key, column.key))
        ? { valuePrecision: 3 }
        : { note: "No valid comparable score pair is available." };
    }),
  );
  const hasMissingPairs = pairValues.size < expectedPairCount;

  return {
    type: "heatmap",
    title: "Alternative relationships",
    truncateLabels: true,
    scale: { kind: "sequential", min: 0, max: 1, valuePrecision: 3 },
    phase: phase?.phase,
    hasMissingPairs,
    allScoresEqual: !hasMissingPairs && [...pairValues.values()].every((value) => value === 0),
    data: {
      rows: alternatives,
      columns: alternatives,
      values,
      details,
    },
  };
};
