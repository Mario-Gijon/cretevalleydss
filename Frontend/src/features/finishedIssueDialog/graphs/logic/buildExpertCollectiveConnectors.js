const finitePoint = (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y);
const TIE_TOLERANCE = 1e-9;

export const projectedDistance = (from, to) => Math.hypot(from.x - to.x, from.y - to.y);

export const buildExpertCollectiveConnectors = ({ expertPoints = [], collectivePoint, executionLabel = null }) => {
  if (!finitePoint(collectivePoint)) return [];
  const connectors = expertPoints.filter(finitePoint).map((point, index) => ({
    expertIdentity: point.identity || point.email || point.label || String(index),
    expertLabel: point.label || point.email || `Expert ${index + 1}`,
    executionLabel,
    from: { x: point.x, y: point.y },
    to: { x: collectivePoint.x, y: collectivePoint.y },
    projectedDistance: projectedDistance(point, collectivePoint),
    isClosest: false,
  }));
  const minimum = Math.min(...connectors.map((entry) => entry.projectedDistance));
  return connectors.map((entry) => ({ ...entry, isClosest: entry.projectedDistance - minimum <= TIE_TOLERANCE }));
};

export const pointToSegmentDistance = (point, from, to) => {
  const dx = to.x - from.x; const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(point.x - from.x, point.y - from.y);
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy));
};

export const findHoveredConnector = ({ point, connectors = [], tolerance = 8 }) => connectors
  .map((connector) => ({ connector, distance: pointToSegmentDistance(point, connector.from, connector.to) }))
  .filter((entry) => entry.distance <= tolerance)
  .sort((left, right) => left.distance - right.distance)[0]?.connector || null;

export default buildExpertCollectiveConnectors;
