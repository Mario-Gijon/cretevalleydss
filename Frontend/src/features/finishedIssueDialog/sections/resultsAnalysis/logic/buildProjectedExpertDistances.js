const finite = (value) => typeof value === "number" && Number.isFinite(value);

export const buildProjectedExpertDistances = (projection) => {
  if (!projection?.available || !projection.collectivePoint) return [];
  const { collectivePoint } = projection;
  return projection.expertPoints
    .map((expert, index) => ({
      ...expert,
      originalIndex: index,
      distance: Math.hypot(
        expert.x - collectivePoint.x,
        expert.y - collectivePoint.y,
      ),
    }))
    .filter((entry) => finite(entry.distance))
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        String(left.identity).localeCompare(String(right.identity)) ||
        left.originalIndex - right.originalIndex,
    )
    .map((entry, index, rows) => ({
      ...entry,
      closest:
        index === 0 || Math.abs(entry.distance - rows[0].distance) <= 1e-12,
    }));
};

export default buildProjectedExpertDistances;
