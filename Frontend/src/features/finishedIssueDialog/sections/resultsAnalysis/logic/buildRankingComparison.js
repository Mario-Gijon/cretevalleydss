const asArray = (value) => (Array.isArray(value) ? value : []);

const finiteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const stableRankingMap = (ranking) =>
  new Map(
    asArray(ranking)
      .filter((entry) => entry?.id)
      .map((entry, index) => [
        entry.id,
        Number.isFinite(entry?.position) ? entry.position : index + 1,
      ])
  );

const sameAlternativeSet = (left, right) => {
  if (left.size !== right.size) return false;
  for (const key of left.keys()) {
    if (!right.has(key)) return false;
  }
  return true;
};

const pearson = (left, right) => {
  if (left.length !== right.length || left.length < 2) return null;

  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0;
  let leftSquared = 0;
  let rightSquared = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftSquared += leftDelta ** 2;
    rightSquared += rightDelta ** 2;
  }

  const denominator = Math.sqrt(leftSquared * rightSquared);
  if (!denominator) return left.every((value, index) => value === right[index]) ? 1 : null;
  return numerator / denominator;
};

const unavailableComparison = (executions, reason) => ({
  available: false,
  reason,
  executions,
  alternatives: [],
  cells: [],
});

export const buildRankingMovement = (executions) => {
  const normalized = asArray(executions);
  if (normalized.length < 2) return unavailableComparison(normalized, "At least two executions are required.");
  if (normalized.some((execution) => !execution?.available)) {
    return unavailableComparison(normalized, "Every selected execution needs a complete ranking.");
  }

  const baseRanking = asArray(normalized[0]?.ranking);
  const baseMap = stableRankingMap(baseRanking);
  for (const execution of normalized.slice(1)) {
    if (!sameAlternativeSet(baseMap, stableRankingMap(execution?.ranking))) {
      return unavailableComparison(normalized, "Selected executions do not contain the same complete alternative set.");
    }
  }

  const alternatives = baseRanking.map((alternative) => ({
    id: alternative.id,
    name: alternative.name,
    positions: normalized.map((execution) => ({
      executionKey: execution.key,
      position: stableRankingMap(execution.ranking).get(alternative.id),
    })),
  }));

  return {
    available: true,
    reason: null,
    executions: normalized.map((execution) => ({ key: execution.key, label: execution.displayLabel, color: execution.color })),
    alternatives,
    maxPosition: Math.max(1, ...alternatives.flatMap((alternative) => alternative.positions.map((entry) => entry.position))),
  };
};

export const buildSpearmanCorrelationMatrix = (executions) => {
  const normalized = asArray(executions);
  if (normalized.length < 2) return unavailableComparison(normalized, "At least two executions are required.");
  if (normalized.some((execution) => !execution?.available)) {
    return unavailableComparison(normalized, "Every selected execution needs a complete ranking.");
  }

  const maps = normalized.map((execution) => stableRankingMap(execution.ranking));
  const baseMap = maps[0];
  if (maps.some((map) => !sameAlternativeSet(baseMap, map))) {
    return unavailableComparison(normalized, "Selected executions do not contain the same complete alternative set.");
  }

  const alternativeIds = [...baseMap.keys()];
  const cells = normalized.flatMap((rowExecution, rowIndex) => normalized.map((columnExecution, columnIndex) => {
    const rowValues = alternativeIds.map((id) => maps[rowIndex].get(id));
    const columnValues = alternativeIds.map((id) => maps[columnIndex].get(id));
    const value = rowIndex === columnIndex ? 1 : pearson(rowValues, columnValues);
    return {
      rowKey: rowExecution.key,
      columnKey: columnExecution.key,
      value: finiteNumber(value),
      formattedValue: finiteNumber(value) === null ? "—" : value.toFixed(2),
    };
  }));

  return {
    available: true,
    reason: null,
    scale: { min: -1, max: 1 },
    executions: normalized.map((execution) => ({ key: execution.key, label: execution.displayLabel, color: execution.color })),
    cells,
  };
};
