const isFinitePoint = (point) =>
  Array.isArray(point) &&
  point.length === 2 &&
  Number.isFinite(Number(point[0])) &&
  Number.isFinite(Number(point[1]));

const normalizePoint = (point) => ({ x: Number(point[0]), y: Number(point[1]) });

const normalizedIdentity = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export const normalizePlotsGraphic = (plotsGraphic) => {
  if (!plotsGraphic || typeof plotsGraphic !== "object") return null;

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
  const idsRaw = Array.isArray(plotsGraphic.expert_ids)
    ? plotsGraphic.expert_ids
    : Array.isArray(plotsGraphic.expertIds)
      ? plotsGraphic.expertIds
      : [];
  const emailsRaw = Array.isArray(plotsGraphic.expert_emails)
    ? plotsGraphic.expert_emails
    : Array.isArray(plotsGraphic.expertEmails)
      ? plotsGraphic.expertEmails
      : [];
  const pointsByIdRaw =
    plotsGraphic.expert_points_by_id &&
    typeof plotsGraphic.expert_points_by_id === "object"
      ? plotsGraphic.expert_points_by_id
      : null;
  const pointsByEmailRaw =
    plotsGraphic.expert_points_by_email &&
    typeof plotsGraphic.expert_points_by_email === "object"
      ? plotsGraphic.expert_points_by_email
      : null;
  const expertPoints = [];
  let hasInvalidCoordinates = false;

  if (pointsByIdRaw || pointsByEmailRaw) {
    const pointsByIdentity = pointsByIdRaw || pointsByEmailRaw;
    const identitySource = pointsByIdRaw ? "id" : "email";
    for (const [label, point] of Object.entries(pointsByIdentity)) {
      if (!isFinitePoint(point)) {
        hasInvalidCoordinates = true;
        continue;
      }
      const identity = normalizedIdentity(label);
      expertPoints.push({ label: identity || "Expert", identity, identitySource, ...normalizePoint(point) });
    }
  } else if (Array.isArray(expertPointsRaw)) {
    expertPointsRaw.forEach((point, index) => {
      if (!isFinitePoint(point)) {
        hasInvalidCoordinates = true;
        return;
      }
      const labelCandidate = labelsRaw[index];
      const controlledLabel = normalizedIdentity(labelCandidate);
      const id = normalizedIdentity(idsRaw[index]);
      const email = normalizedIdentity(emailsRaw[index]);
      const fallbackLabel = `Expert ${index + 1}`;
      expertPoints.push({
        label: controlledLabel || email || id || fallbackLabel,
        // Older controlled plotsGraphic payloads carry only an ordered expert
        // sequence. normalizePlotsGraphic gives that sequence deterministic
        // canonical labels so equal stored projections can still be grouped.
        identity: id || email || controlledLabel || fallbackLabel,
        identitySource: id ? "id" : email ? "email" : controlledLabel ? "label" : "normalized-label",
        ...normalizePoint(point),
      });
    });
  }

  const collectivePoint = isFinitePoint(collectivePointRaw)
    ? { label: "Collective", ...normalizePoint(collectivePointRaw) }
    : null;
  if (collectivePointRaw && !collectivePoint) hasInvalidCoordinates = true;

  return {
    expertPoints,
    collectivePoint,
    reason,
    raw: plotsGraphic,
    hasInvalidCoordinates,
    isValid: expertPoints.length > 0 && !hasInvalidCoordinates && isFinitePoint([collectivePoint?.x, collectivePoint?.y]),
  };
};
