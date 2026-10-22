import {
  buildExpertCollectiveOverlapGroups,
  groupCoincidentExpertPoints,
} from "./expertCollectiveOverlap.js";

const parseCoordinatePair = (point) => {
  if (!Array.isArray(point) || point.length !== 2) {
    return null;
  }

  const x = Number(point[0]);
  const y = Number(point[1]);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { x, y };
};

const normalizedText = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const buildExpertIdentity = ({ label, email, id, index }) => {
  const normalizedLabel = normalizedText(label);
  const normalizedEmail = normalizedText(email);
  const normalizedId = normalizedText(id);
  const displayLabel = normalizedLabel || normalizedEmail || normalizedId || `Expert ${index + 1}`;
  return {
    label: displayLabel,
    email: normalizedEmail || displayLabel,
    identity: normalizedId || normalizedEmail || normalizedLabel || `Expert ${index + 1}`,
  };
};

const buildCanonicalExpertPoints = (current) => {
  if (Array.isArray(current.expertPoints)) {
    return current.expertPoints
      .map((entry, index) => {
        const x = Number(entry?.x);
        const y = Number(entry?.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }

        return {
          x,
          y,
          ...buildExpertIdentity({
            label: entry?.label,
            email: entry?.email,
            id: entry?.identity,
            index,
          }),
        };
      })
      .filter(Boolean);
  }

  if (
    current.expert_points_by_email &&
    typeof current.expert_points_by_email === "object"
  ) {
    return Object.entries(current.expert_points_by_email)
      .map(([email, point]) => {
        const parsed = parseCoordinatePair(point);

        return parsed
          ? {
              ...parsed,
              ...buildExpertIdentity({ label: email, email, id: email, index: 0 }),
            }
          : null;
      })
      .filter(Boolean);
  }

  if (Array.isArray(current.expert_points)) {
    const labels = Array.isArray(current.expert_labels)
      ? current.expert_labels
      : [];
    const ids = Array.isArray(current.expert_ids)
      ? current.expert_ids
      : Array.isArray(current.expertIds)
        ? current.expertIds
        : [];
    const emails = Array.isArray(current.expert_emails)
      ? current.expert_emails
      : Array.isArray(current.expertEmails)
        ? current.expertEmails
        : [];

    return current.expert_points
      .map((point, index) => {
        const parsed = parseCoordinatePair(point);

        if (!parsed) {
          return null;
        }

        return {
          ...parsed,
          ...buildExpertIdentity({
            label: labels[index],
            email: emails[index],
            id: ids[index],
            index,
          }),
        };
      })
      .filter(Boolean);
  }

  return [];
};

const buildCollectivePoint = (current) => {
  const collectiveCandidate =
    current.collectivePoint || current.collective_point;
  const parsedCollective = Array.isArray(collectiveCandidate)
    ? parseCoordinatePair(collectiveCandidate)
    : Number.isFinite(Number(collectiveCandidate?.x)) &&
        Number.isFinite(Number(collectiveCandidate?.y))
      ? {
          x: Number(collectiveCandidate.x),
          y: Number(collectiveCandidate.y),
        }
      : null;

  return parsedCollective || { x: 0, y: 0 };
};

const buildAxisRange = (values) => {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding =
    minimum === maximum
      ? 1
      : Math.max((maximum - minimum) * 0.2, 0.2);

  return {
    min: minimum - padding,
    max: maximum + padding,
  };
};

/**
 * Normalizes every currently supported analytical-scatter payload shape.
 *
 * Legacy snake_case inputs remain intentional compatibility contracts here so
 * the chart component can consume one stable view model.
 */
export const buildAnalyticalScatterViewModel = ({ data, phase }) => {
  const current = data?.[phase];

  if (!current) {
    return null;
  }

  const expertPoints = buildCanonicalExpertPoints(current);

  if (expertPoints.length === 0) {
    return null;
  }

  const collectivePoint = buildCollectivePoint(current);
  const markerGroups = groupCoincidentExpertPoints(expertPoints);
  const overlapGroups = buildExpertCollectiveOverlapGroups({
    expertPoints,
    collectivePoint,
    hasEvaluationEqualityEvidence:
      current.hasEvaluationEqualityEvidence === true,
    identicalEvaluationGroups: current.identicalEvaluationGroups,
    collectiveIdenticalExpertIds: current.collectiveIdenticalExpertIds,
  });

  return {
    expertPoints,
    expertMarkerGroups: markerGroups,
    collectivePoint,
    overlapGroups,
    xRange: buildAxisRange([
      ...expertPoints.map((point) => point.x),
      collectivePoint.x,
    ]),
    yRange: buildAxisRange([
      ...expertPoints.map((point) => point.y),
      collectivePoint.y,
    ]),
  };
};

export default buildAnalyticalScatterViewModel;
