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

const buildCanonicalExpertPoints = (current) => {
  if (Array.isArray(current.expertPoints)) {
    return current.expertPoints
      .map((entry, index) => {
        const x = Number(entry?.x);
        const y = Number(entry?.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }

        const label =
          typeof entry?.label === "string" && entry.label.trim()
            ? entry.label.trim()
            : `Expert ${index + 1}`;

        return { x, y, email: label };
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

        return parsed ? { ...parsed, email: String(email) } : null;
      })
      .filter(Boolean);
  }

  if (Array.isArray(current.expert_points)) {
    const labels = Array.isArray(current.expert_labels)
      ? current.expert_labels
      : [];

    return current.expert_points
      .map((point, index) => {
        const parsed = parseCoordinatePair(point);

        if (!parsed) {
          return null;
        }

        const labelCandidate = labels[index];
        const email =
          typeof labelCandidate === "string" && labelCandidate.trim()
            ? labelCandidate.trim()
            : `Expert ${index + 1}`;

        return { ...parsed, email };
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

  return {
    expertPoints,
    collectivePoint,
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
