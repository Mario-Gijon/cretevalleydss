import { displayedProjectedDistance } from "../../../graphs/logic/buildExpertCollectiveConnectors.js";

const finite = (value) => typeof value === "number" && Number.isFinite(value);

export const buildProjectedExpertDistances = (projection) => {
  if (!projection?.available || !projection.collectivePoint) return [];
  const { collectivePoint } = projection;
  const rows = projection.expertPoints
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
    .map((entry) => ({
      ...entry,
      displayedDistance: displayedProjectedDistance(entry.distance),
    }));
  const minimum = Math.min(...rows.map((entry) => entry.displayedDistance));
  return rows.map((entry) => ({
    ...entry,
    closest: entry.displayedDistance === minimum,
  }));
};

export default buildProjectedExpertDistances;
