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

const describeJudgment = ({ fromName, toName, value }) => {
  if (
    typeof fromName !== "string" || !fromName ||
    typeof toName !== "string" || !toName ||
    typeof value !== "number" || !Number.isFinite(value) || value <= 0
  ) return null;

  if (ratioClose(value, 1)) {
    return `${fromName} and ${toName} as equally important`;
  }
  return value > 1
    ? `${fromName} as more important than ${toName}`
    : `${toName} as more important than ${fromName}`;
};

const describeComparison = ({ firstName, secondName, ratio }) => {
  if (typeof ratio !== "number" || !Number.isFinite(ratio) || ratio <= 0) return null;
  if (ratioClose(ratio, 1)) {
    return `${firstName} and ${secondName} as equally important`;
  }
  return ratio > 1
    ? `${firstName} as more important than ${secondName}`
    : `${secondName} as more important than ${firstName}`;
};

const describeCombinedJudgments = ({ firstName, thirdName, impliedRatio, outsideSaatyScale }) => {
  if (outsideSaatyScale) {
    const [moreImportant, lessImportant] = impliedRatio > 1
      ? [firstName, thirdName]
      : [thirdName, firstName];
    return `Taken together, those answers suggest ${moreImportant} would need to be far more important than ${lessImportant}—beyond the available comparison scale`;
  }

  if (ratioClose(impliedRatio, 1)) {
    return `Taken together, those answers suggest ${firstName} and ${thirdName} should be equally important`;
  }
  return impliedRatio > 1
    ? `Taken together, those answers suggest ${firstName} should be more important than ${thirdName}`
    : `Taken together, those answers suggest ${thirdName} should be more important than ${firstName}`;
};

export const explainDiagnosticTriad = (triad) => {
  const criteria = Array.isArray(triad?.criteria) ? triad.criteria : [];
  const nameById = new Map(criteria.map((criterion) => [criterion?.id, criterion?.name]));
  const comparisons = Array.isArray(triad?.comparisons) ? triad.comparisons : [];
  if (criteria.length !== 3 || comparisons.length !== 3) return null;

  const [first, second, third] = criteria;
  if (
    typeof triad.impliedRatio !== "number" || !Number.isFinite(triad.impliedRatio) || triad.impliedRatio <= 0 ||
    typeof triad.directRatio !== "number" || !Number.isFinite(triad.directRatio) || triad.directRatio <= 0
  ) return null;

  const getComparison = (fromCriterion, toCriterion) => comparisons.find(
    (comparison) => comparison?.fromCriterionId === fromCriterion.id &&
      comparison?.toCriterionId === toCriterion.id,
  );
  const describedJudgments = [
    getComparison(first, second),
    getComparison(second, third),
  ].map((comparison) => describeJudgment({
    fromName: nameById.get(comparison?.fromCriterionId),
    toName: nameById.get(comparison?.toCriterionId),
    value: comparison?.value,
  }));
  if (describedJudgments.some((description) => !description)) return null;

  const directComparison = describeComparison({
    firstName: first?.name,
    secondName: third?.name,
    ratio: triad.directRatio,
  });
  if (!directComparison) return null;

  const outsideSaatyScale = triad.impliedRatio > 9 || triad.impliedRatio < 1 / 9;
  const combinedJudgments = describeCombinedJudgments({
    firstName: first.name,
    thirdName: third.name,
    impliedRatio: triad.impliedRatio,
    outsideSaatyScale,
  });
  const cycleRatio = typeof triad.cycleRatio === "number" && Number.isFinite(triad.cycleRatio)
    ? triad.cycleRatio
    : triad.impliedRatio / triad.directRatio;
  const discrepancyFactor = Math.max(cycleRatio, 1 / cycleRatio);
  const mismatch = discrepancyFactor >= 3
    ? "There is a substantial mismatch between these views."
    : "These answers do not quite agree with each other.";

  return {
    text: `You rated ${describedJudgments[0]}, and ${describedJudgments[1]}. ${combinedJudgments}. However, you rated ${directComparison}. ${mismatch} This does not mean any one answer is wrong.`,
    outsideSaatyScale,
    strongContradiction: discrepancyFactor >= 3,
  };
};
