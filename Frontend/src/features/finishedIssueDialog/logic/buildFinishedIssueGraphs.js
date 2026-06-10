const isFinitePoint = (point) =>
  Array.isArray(point) &&
  point.length === 2 &&
  Number.isFinite(Number(point[0])) &&
  Number.isFinite(Number(point[1]));

const normalizePoint = (point) => ({
  x: Number(point[0]),
  y: Number(point[1]),
});

export const normalizePlotsGraphic = (plotsGraphic) => {
  if (!plotsGraphic || typeof plotsGraphic !== "object") {
    return null;
  }

  const expertPointsRaw = Array.isArray(plotsGraphic.expert_points)
    ? plotsGraphic.expert_points
    : Array.isArray(plotsGraphic.expertPoints)
      ? plotsGraphic.expertPoints
      : null;

  const collectivePointRaw = Array.isArray(plotsGraphic.collective_point)
    ? plotsGraphic.collective_point
    : Array.isArray(plotsGraphic.collectivePoint)
      ? plotsGraphic.collectivePoint
      : null;

  const reason =
    typeof plotsGraphic.reason === "string" && plotsGraphic.reason.trim()
      ? plotsGraphic.reason.trim()
      : null;

  const labelsRaw = Array.isArray(plotsGraphic.expert_labels)
    ? plotsGraphic.expert_labels
    : [];
  const pointsByEmailRaw =
    plotsGraphic.expert_points_by_email &&
    typeof plotsGraphic.expert_points_by_email === "object"
      ? plotsGraphic.expert_points_by_email
      : null;

  const expertPoints = [];

  if (pointsByEmailRaw) {
    for (const [label, point] of Object.entries(pointsByEmailRaw)) {
      if (!isFinitePoint(point)) continue;
      expertPoints.push({
        label: String(label),
        ...normalizePoint(point),
      });
    }
  } else if (Array.isArray(expertPointsRaw)) {
    expertPointsRaw.forEach((point, index) => {
      if (!isFinitePoint(point)) return;
      const labelCandidate = labelsRaw[index];
      const label =
        typeof labelCandidate === "string" && labelCandidate.trim()
          ? labelCandidate.trim()
          : `Expert ${index + 1}`;

      expertPoints.push({
        label,
        ...normalizePoint(point),
      });
    });
  }

  const collectivePoint = isFinitePoint(collectivePointRaw)
    ? {
        label: "Collective",
        ...normalizePoint(collectivePointRaw),
      }
    : null;

  return {
    expertPoints,
    collectivePoint,
    reason,
    raw: plotsGraphic,
    isValid:
      expertPoints.length > 0 &&
      isFinitePoint([collectivePoint?.x, collectivePoint?.y]),
  };
};
