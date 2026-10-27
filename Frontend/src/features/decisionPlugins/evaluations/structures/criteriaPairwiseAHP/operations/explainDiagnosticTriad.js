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

const describeRatedJudgment = ({ firstName, secondName, ratio }) => {
  if (ratioClose(ratio, 1)) {
    return `${firstName} and ${secondName} as equally important`;
  }
  return ratio > 1
    ? `${firstName} as more important than ${secondName}`
    : `${secondName} as more important than ${firstName}`;
};

const describeImportanceStatement = ({ firstName, secondName, ratio }) => {
  if (ratioClose(ratio, 1)) return `${firstName} and ${secondName} are equally important`;
  if (ratio > 1) {
    return `${firstName} is ${formatAHPDiagnosticRatio(ratio)} times as important as ${secondName}`;
  }
  return `${secondName} is ${formatAHPDiagnosticRatio(1 / ratio)} times as important as ${firstName}`;
};

const describeRatedStrength = ({ firstName, secondName, ratio }) => {
  if (ratioClose(ratio, 1)) return `${firstName} and ${secondName} as equally important`;
  if (ratio > 1) {
    return `${firstName} as ${formatAHPDiagnosticRatio(ratio)} times as important as ${secondName}`;
  }
  return `${secondName} as ${formatAHPDiagnosticRatio(1 / ratio)} times as important as ${firstName}`;
};

const findComparison = (comparisons, fromCriterionId, toCriterionId) =>
  comparisons.find((comparison) =>
    comparison?.fromCriterionId === fromCriterionId && comparison?.toCriterionId === toCriterionId);

const isValidRatio = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const explainDiagnosticTriad = (triad) => {
  const criteria = Array.isArray(triad?.criteria) ? triad.criteria : [];
  const comparisons = Array.isArray(triad?.comparisons) ? triad.comparisons : [];
  if (criteria.length !== 3 || comparisons.length !== 3) return null;

  const [first, second, third] = criteria;
  const firstToSecond = findComparison(comparisons, first?.id, second?.id)?.value;
  const secondToThird = findComparison(comparisons, second?.id, third?.id)?.value;
  const firstToThird = findComparison(comparisons, first?.id, third?.id)?.value;
  if (![first?.name, second?.name, third?.name].every((name) => typeof name === "string" && name) ||
      ![firstToSecond, secondToThird, firstToThird].every(isValidRatio)) {
    return null;
  }

  const impliedRatio = isValidRatio(triad.impliedRatio)
    ? triad.impliedRatio
    : firstToSecond * secondToThird;
  const hasOpposingDirections =
    (impliedRatio > 1 && firstToThird < 1) ||
    (impliedRatio < 1 && firstToThird > 1);

  if (hasOpposingDirections) {
    return {
      type: "direction",
      text: `You rated ${describeRatedJudgment({ firstName: first.name, secondName: second.name, ratio: firstToSecond })}, and ${describeRatedJudgment({ firstName: second.name, secondName: third.name, ratio: secondToThird })}, but also ${describeRatedJudgment({ firstName: first.name, secondName: third.name, ratio: firstToThird })}.`,
    };
  }

  return {
    type: "intensity",
    text: `You rated ${describeRatedStrength({ firstName: first.name, secondName: second.name, ratio: firstToSecond })}, and ${describeRatedStrength({ firstName: second.name, secondName: third.name, ratio: secondToThird })}. Together, those comparisons imply ${describeImportanceStatement({ firstName: first.name, secondName: third.name, ratio: impliedRatio })}, while you rated ${describeRatedStrength({ firstName: first.name, secondName: third.name, ratio: firstToThird })}.`,
  };
};
