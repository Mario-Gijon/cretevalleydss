const coordinateKey = ({ x, y }) =>
  `${Object.is(x, -0) ? 0 : x}\u0000${Object.is(y, -0) ? 0 : y}`;

const isFinitePoint = (point) =>
  Number.isFinite(point?.x) && Number.isFinite(point?.y);

export const groupCoincidentExpertPoints = (points = []) => {
  const groups = new Map();
  points.filter(isFinitePoint).forEach((point) => {
    const key = coordinateKey(point);
    const existing = groups.get(key);
    if (existing) existing.experts.push(point);
    else groups.set(key, { x: point.x, y: point.y, experts: [point] });
  });
  return [...groups.values()];
};

const identityLabel = (point, duplicate) => {
  const label = point.label || point.email || point.identity || "Expert";
  if (!duplicate) return label;
  const stable = point.email || point.identity;
  return stable && stable !== label ? `${label} (${stable})` : label;
};

const englishList = (values) => {
  if (values.length < 2) return values[0] || "The plotted points";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
};

const expertsShareOriginalMatrix = (expertIds, identicalEvaluationGroups = []) =>
  expertIds.length === 1 ||
  identicalEvaluationGroups.some(
    (group) => expertIds.every((identity) => group.includes(identity)),
  );

const explainEqualityEvidence = ({
  experts,
  hasCollective,
  hasEvaluationEqualityEvidence,
  identicalEvaluationGroups,
  collectiveIdenticalExpertIds,
}) => {
  if (!hasEvaluationEqualityEvidence) {
    return "This coincidence in the 2D projection does not establish that the original evaluations are identical.";
  }

  const expertIds = experts.map((expert) => expert.identity).filter(Boolean);
  const expertsMatch = expertsShareOriginalMatrix(
    expertIds,
    identicalEvaluationGroups,
  );
  const collectiveMatches =
    !hasCollective ||
    expertIds.every((identity) =>
      collectiveIdenticalExpertIds.includes(identity),
    );

  if (expertsMatch && collectiveMatches) {
    if (hasCollective && experts.length === 1) {
      return "The expert's numeric matrix used for the projection and the collective matrix are identical.";
    }
    return hasCollective
      ? "The experts' numeric matrices used for the projection are identical, and the collective matrix matches them exactly."
      : "These experts' numeric matrices used for the projection are identical.";
  }
  if (expertsMatch && experts.length > 1) {
    return "These experts' numeric matrices used for the projection are identical; the shared position alone does not establish equality with the collective matrix.";
  }
  return "The numeric matrices used for this projection are not all identical, so this shared position is a projection effect.";
};

/**
 * Finds exact stored-coordinate overlaps. It deliberately applies no numeric
 * tolerance: a close position is not evidence that coordinates or evaluations
 * are equal. Chart hit-testing handles points that visually touch at the
 * current viewport resolution.
 */
export const buildExpertCollectiveOverlapGroups = ({
  expertPoints = [],
  collectivePoint = null,
  hasEvaluationEqualityEvidence = false,
  identicalEvaluationGroups = [],
  collectiveIdenticalExpertIds = [],
}) => {
  const byPosition = new Map();
  groupCoincidentExpertPoints(expertPoints).forEach((group) => {
    byPosition.set(coordinateKey(group), {
      x: group.x,
      y: group.y,
      experts: group.experts,
      hasCollective: false,
    });
  });
  if (isFinitePoint(collectivePoint)) {
    const key = coordinateKey(collectivePoint);
    const existing = byPosition.get(key);
    if (existing) existing.hasCollective = true;
    else {
      byPosition.set(key, {
        x: collectivePoint.x,
        y: collectivePoint.y,
        experts: [],
        hasCollective: true,
      });
    }
  }

  const labelCounts = expertPoints.reduce((counts, point) => {
    const label = point.label || point.email || point.identity || "Expert";
    counts.set(label, (counts.get(label) || 0) + 1);
    return counts;
  }, new Map());

  return [...byPosition.values()]
    .filter((group) => group.experts.length + Number(group.hasCollective) > 1)
    .map((group) => {
      const labels = group.experts.map((expert) => {
        const label = expert.label || expert.email || expert.identity || "Expert";
        return identityLabel(expert, labelCounts.get(label) > 1);
      });
      if (group.hasCollective) labels.push("the collective");
      return {
        ...group,
        message: `Overlapping projections: ${englishList(labels)} occupy the same stored position. ${explainEqualityEvidence({
          experts: group.experts,
          hasCollective: group.hasCollective,
          hasEvaluationEqualityEvidence,
          identicalEvaluationGroups,
          collectiveIdenticalExpertIds,
        })}`,
      };
    });
};
