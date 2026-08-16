const finite = (value) => typeof value === "number" && Number.isFinite(value);

export const alternativeRelationshipsForPhase = (execution, phase) => {
  const visualization = execution?.genericAnalysis?.visualizations?.find(
    (entry) => entry?.type === "alternativeRelationships",
  );
  const phases = Array.isArray(visualization?.phases)
    ? visualization.phases
    : [];
  return phases.find((entry) => entry?.phase === phase) || null;
};

export const relationshipPairValue = ({
  pairs = [],
  leftAlternativeId,
  rightAlternativeId,
}) => {
  if (
    !leftAlternativeId ||
    !rightAlternativeId ||
    leftAlternativeId === rightAlternativeId
  )
    return null;
  const pair = pairs.find(
    (entry) =>
      (entry?.leftAlternativeId === leftAlternativeId &&
        entry?.rightAlternativeId === rightAlternativeId) ||
      (entry?.leftAlternativeId === rightAlternativeId &&
        entry?.rightAlternativeId === leftAlternativeId),
  );
  return finite(pair?.relativeSeparation) ? pair.relativeSeparation : null;
};

export const relationshipAlternatives = (relationship) =>
  (Array.isArray(relationship?.alternatives) ? relationship.alternatives : [])
    .filter((entry) => entry?.alternativeId)
    .slice()
    .sort(
      (left, right) =>
        (left.rank ?? Number.MAX_SAFE_INTEGER) -
          (right.rank ?? Number.MAX_SAFE_INTEGER) ||
        String(left.name || "").localeCompare(String(right.name || "")),
    );

export const buildRelationshipNetworkNodes = (alternatives) => {
  const count = alternatives.length;
  return alternatives.map((alternative, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(count, 1);
    return {
      ...alternative,
      x: 50 + 37 * Math.cos(angle),
      y: 50 + 37 * Math.sin(angle),
    };
  });
};

export default alternativeRelationshipsForPhase;
