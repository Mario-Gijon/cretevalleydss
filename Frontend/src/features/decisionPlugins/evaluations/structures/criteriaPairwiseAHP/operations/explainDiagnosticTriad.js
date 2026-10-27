const ratioClose = (first, second) => Math.abs(first - second) <= 1e-9;

export const formatAHPDiagnosticRatio = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
  const nearestInteger = Math.round(value);
  if (ratioClose(value, nearestInteger)) return String(nearestInteger);
  const reciprocalInteger = Math.round(1 / value);
  if (reciprocalInteger > 1 && ratioClose(value, 1 / reciprocalInteger)) {
    return `1/${reciprocalInteger}`;
  }
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
};

const describeDirectedJudgment = ({ fromName, toName, value }) => {
  if (
    typeof fromName !== "string" || !fromName ||
    typeof toName !== "string" || !toName ||
    typeof value !== "number" || !Number.isFinite(value) || value <= 0
  ) return null;
  if (ratioClose(value, 1)) {
    return `${fromName} and ${toName} were judged equally important`;
  }
  if (value > 1) {
    return `${fromName} was judged ${formatAHPDiagnosticRatio(value)} times more important than ${toName}`;
  }
  return `${toName} was judged ${formatAHPDiagnosticRatio(1 / value)} times more important than ${fromName}`;
};

const describeRatio = ({ firstName, secondName, ratio }) => {
  if (typeof ratio !== "number" || !Number.isFinite(ratio) || ratio <= 0) return null;
  if (ratioClose(ratio, 1)) return `${firstName} and ${secondName} are equally important`;
  if (ratio > 1) {
    return `${firstName} is ${formatAHPDiagnosticRatio(ratio)} times more important than ${secondName}`;
  }
  return `${secondName} is ${formatAHPDiagnosticRatio(1 / ratio)} times more important than ${firstName}`;
};

export const explainDiagnosticTriad = (triad) => {
  const criteria = Array.isArray(triad?.criteria) ? triad.criteria : [];
  const nameById = new Map(criteria.map((criterion) => [criterion?.id, criterion?.name]));
  const comparisons = Array.isArray(triad?.comparisons) ? triad.comparisons : [];
  if (criteria.length !== 3 || comparisons.length !== 3) return null;

  const [first, third] = [criteria[0], criteria[2]];
  const descriptions = comparisons.map((comparison) => describeDirectedJudgment({
    fromName: nameById.get(comparison?.fromCriterionId),
    toName: nameById.get(comparison?.toCriterionId),
    value: comparison?.value,
  }));
  if (descriptions.some((description) => !description)) return null;

  const implied = describeRatio({
    firstName: first.name,
    secondName: third.name,
    ratio: triad.impliedRatio,
  });
  const direct = describeRatio({
    firstName: first.name,
    secondName: third.name,
    ratio: triad.directRatio,
  });
  if (!implied || !direct) return null;

  const outsideSaatyScale = triad.impliedRatio > 9 || triad.impliedRatio < 1 / 9;
  return {
    text: `${descriptions[0]}. ${descriptions[1]}. Together, they imply that ${implied}, while the direct comparison says ${direct}. This cycle is a prompt to review the judgments; it does not identify any one comparison as incorrect.`,
    outsideSaatyScale,
  };
};
