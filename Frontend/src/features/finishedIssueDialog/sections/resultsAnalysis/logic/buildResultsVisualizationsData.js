import { normalizePlotsGraphic } from "../../../shared/logic/buildFinishedIssueGraphs.js";

export const ANALYTICAL_PROJECTION_TOLERANCE = 1e-4;

const finite = (value) => typeof value === "number" && Number.isFinite(value);
const samePoint = (left, right, tolerance) =>
  Math.abs(left.x - right.x) <= tolerance &&
  Math.abs(left.y - right.y) <= tolerance;
const byIdentity = (left, right) => left.identity.localeCompare(right.identity);
const pointCopy = (point) => ({ ...point });

const unavailableReason = (normalized) => {
  if (normalized?.reason) return normalized.reason;
  if (!normalized) return "missing_analytical_projection";
  if (normalized.hasInvalidCoordinates) return "invalid_analytical_projection";
  if (!normalized.isValid) return "invalid_analytical_projection";
  return null;
};

const storedExpertCollectiveProjection = (execution) => {
  const standardized = execution?.standardizedOutput?.plotsGraphic;
  if (standardized && typeof standardized === "object" && Object.keys(standardized).length) {
    return standardized;
  }
  return execution?.genericAnalysis?.facts?.expertCollectiveRelationship?.projection;
};

/**
 * Builds the only projection shape used by comparison. The current controlled
 * service format stores experts relative to its collective MDS point while the
 * collective itself remains in the original projected frame. Reconstructing
 * absolute expert coordinates here makes one internally consistent frame
 * without changing the stored payload or reading unrestricted model output.
 */
export const buildCanonicalAnalyticalProjection = ({
  execution,
  slotIndex = 0,
}) => {
  const normalized = normalizePlotsGraphic(
    storedExpertCollectiveProjection(execution),
  );
  const base = {
    key: execution?.key || "",
    executionName: execution?.name || "—",
    modelName: execution?.modelName || "—",
    displayLabel: execution?.displayLabel || execution?.name || "—",
    fullLabel:
      execution?.fullLabel || execution?.displayLabel || execution?.name || "—",
    color: execution?.color,
    sourcePhase: execution?.sourcePhase ?? null,
    slotIndex,
    available: false,
    displayAvailable: false,
    unavailableReason: unavailableReason(normalized),
    expertPoints: [],
    collectivePoint: null,
  };
  if (!normalized?.isValid) return base;

  const collectivePoint = normalized.collectivePoint;
  const expertPoints = normalized.expertPoints.map((point) => ({
    identity: point.identity || null,
    label: point.label,
    email:
      point.email || (point.identitySource === "email" ? point.identity : null),
    x: point.x + collectivePoint.x,
    y: point.y + collectivePoint.y,
  }));
  if (
    !expertPoints.every(
      (point) => point.identity && finite(point.x) && finite(point.y),
    ) ||
    !finite(collectivePoint.x) ||
    !finite(collectivePoint.y)
  ) {
    return {
      ...base,
      displayAvailable: true,
      expertPoints,
      collectivePoint: pointCopy(collectivePoint),
      unavailableReason: "missing_stable_expert_identity",
    };
  }
  expertPoints.sort(byIdentity);
  if (
    new Set(expertPoints.map((point) => point.identity)).size !==
    expertPoints.length
  ) {
    return {
      ...base,
      displayAvailable: true,
      expertPoints,
      collectivePoint: pointCopy(collectivePoint),
      unavailableReason: "duplicate_expert_identity",
    };
  }
  return {
    ...base,
    available: true,
    displayAvailable: true,
    unavailableReason: null,
    expertPoints,
    collectivePoint: pointCopy(collectivePoint),
  };
};

const sameIdentitySet = (left, right) =>
  left.expertPoints.length === right.expertPoints.length &&
  left.expertPoints.every(
    (point, index) => point.identity === right.expertPoints[index]?.identity,
  );

export const areAnalyticalProjectionsEquivalent = (
  left,
  right,
  tolerance = ANALYTICAL_PROJECTION_TOLERANCE,
) => {
  if (
    !left?.available ||
    !right?.available ||
    !left.collectivePoint ||
    !right.collectivePoint ||
    !sameIdentitySet(left, right)
  )
    return false;
  return (
    left.expertPoints.every((point, index) =>
      samePoint(point, right.expertPoints[index], tolerance),
    ) && samePoint(left.collectivePoint, right.collectivePoint, tolerance)
  );
};

const centroid = (points) => ({
  x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
  y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
});
const subtract = (point, center) => ({
  x: point.x - center.x,
  y: point.y - center.y,
});

/** A deterministic 2D similarity fit, evaluating reflection explicitly. */
export const alignProjectionToReference = ({ reference, candidate }) => {
  if (
    !reference?.available ||
    !candidate?.available ||
    !sameIdentitySet(reference, candidate)
  ) {
    return {
      available: false,
      unavailableReason: "expert_identities_do_not_match",
    };
  }
  if (reference.expertPoints.length < 2)
    return {
      available: false,
      unavailableReason: "insufficient_alignment_anchors",
    };
  const refCenter = centroid(reference.expertPoints);
  const candidateCenter = centroid(candidate.expertPoints);
  const referenceAnchors = reference.expertPoints.map((point) =>
    subtract(point, refCenter),
  );
  const candidateAnchors = candidate.expertPoints.map((point) =>
    subtract(point, candidateCenter),
  );
  const candidateVariance = candidateAnchors.reduce(
    (sum, point) => sum + point.x ** 2 + point.y ** 2,
    0,
  );
  const referenceVariance = referenceAnchors.reduce(
    (sum, point) => sum + point.x ** 2 + point.y ** 2,
    0,
  );
  if (candidateVariance <= 1e-12 || referenceVariance <= 1e-12)
    return {
      available: false,
      unavailableReason: "degenerate_alignment_anchors",
    };

  const fit = (reflected) => {
    let dot = 0;
    let cross = 0;
    candidateAnchors.forEach((source, index) => {
      const target = referenceAnchors[index];
      const x = reflected ? -source.x : source.x;
      dot += x * target.x + source.y * target.y;
      cross += x * target.y - source.y * target.x;
    });
    const magnitude = Math.hypot(dot, cross);
    if (magnitude <= 1e-12) return null;
    const cos = dot / magnitude;
    const sin = cross / magnitude;
    const scale = magnitude / candidateVariance;
    const transform = (point) => {
      const centered = subtract(point, candidateCenter);
      const x = reflected ? -centered.x : centered.x;
      return {
        x: refCenter.x + scale * (cos * x - sin * centered.y),
        y: refCenter.y + scale * (sin * x + cos * centered.y),
      };
    };
    const alignedAnchors = candidate.expertPoints.map(transform);
    const rmsResidual = Math.sqrt(
      alignedAnchors.reduce(
        (sum, point, index) =>
          sum +
          (point.x - reference.expertPoints[index].x) ** 2 +
          (point.y - reference.expertPoints[index].y) ** 2,
        0,
      ) / alignedAnchors.length,
    );
    return { transform, scale, reflected, rmsResidual };
  };
  const possibilities = [fit(false), fit(true)]
    .filter(Boolean)
    .sort(
      (left, right) =>
        left.rmsResidual - right.rmsResidual ||
        Number(left.reflected) - Number(right.reflected),
    );
  const best = possibilities[0];
  if (!best)
    return {
      available: false,
      unavailableReason: "invalid_alignment_transform",
    };
  const alignedProjection = {
    ...candidate,
    expertPoints: candidate.expertPoints.map((point) => ({
      ...point,
      ...best.transform(point),
    })),
    collectivePoint: {
      ...candidate.collectivePoint,
      ...best.transform(candidate.collectivePoint),
    },
  };
  if (
    ![
      ...alignedProjection.expertPoints,
      alignedProjection.collectivePoint,
    ].every((point) => finite(point.x) && finite(point.y)) ||
    !finite(best.rmsResidual)
  )
    return {
      available: false,
      unavailableReason: "invalid_alignment_transform",
    };
  return {
    available: true,
    unavailableReason: null,
    alignedProjection,
    diagnostics: {
      rmsResidual: best.rmsResidual,
      scale: best.scale,
      reflected: best.reflected,
    },
  };
};

const formatEnglishList = (labels) => {
  const unique = [...new Set(labels.filter(Boolean))];
  if (unique.length < 2) return unique[0] || "The selected executions";
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique.at(-1)}`;
};

export const formatComparisonLegendLabel = (executions) => {
  const normalized = executions.map((execution) => ({
    name:
      execution.executionName ||
      execution.name ||
      execution.label ||
      "Execution",
    displayLabel:
      execution.fullLabel ||
      execution.displayLabel ||
      execution.label ||
      execution.executionName ||
      "Execution",
  }));
  const nameCounts = normalized.reduce((counts, execution) => {
    counts.set(execution.name, (counts.get(execution.name) || 0) + 1);
    return counts;
  }, new Map());
  return formatEnglishList(
    normalized.map((execution) =>
      nameCounts.get(execution.name) > 1
        ? execution.displayLabel
        : execution.name,
    ),
  );
};

const chooseRepresentative = (executions) =>
  executions.find((execution) => execution.key === "base") || executions[0];

/** Groups before any alignment check: equality does not need spatial variation. */
const groupEquivalentProjections = (projections) =>
  projections.reduce((groups, projection) => {
    const group = groups.find((entry) =>
      areAnalyticalProjectionsEquivalent(entry.projection, projection),
    );
    if (group) {
      group.executions.push(projection);
      group.representative = chooseRepresentative(group.executions);
      group.projection = group.representative;
    } else {
      groups.push({
        id: `projection-group-${groups.length + 1}`,
        projection,
        representative: projection,
        executions: [projection],
      });
    }
    return groups;
  }, []);

const equalityMessage = (group) =>
  group.executions.length > 1
    ? `${formatEnglishList(group.executions.map((entry) => entry.displayLabel))} have the same expert and collective points for this visualization.`
    : null;

const visualGroup = (group, projection = group.representative) => ({
  ...projection,
  id: group.id,
  representative: {
    key: group.representative.key,
    label: group.representative.executionName,
    displayLabel: group.representative.displayLabel,
    fullLabel: group.representative.fullLabel,
  },
  projection,
  color: group.representative.color,
  executions: group.executions.map((entry) => ({
    key: entry.key,
    label: entry.displayLabel,
    displayLabel: entry.displayLabel,
    fullLabel: entry.fullLabel,
    color: entry.color,
  })),
  representedExecutions: group.executions.map((entry) => ({
    key: entry.key,
    label: entry.displayLabel,
    displayLabel: entry.displayLabel,
    fullLabel: entry.fullLabel,
    color: entry.color,
  })),
  displayLabels: group.executions.map((entry) => entry.displayLabel),
  shared: group.executions.length > 1,
  equalityMessage: equalityMessage(group),
  groupLabel: formatComparisonLegendLabel(group.executions),
  tooltipLabel: formatEnglishList(
    group.executions.map((entry) => entry.fullLabel),
  ),
});

const buildConsensusVisualization = (payload, executions) => {
  const threshold =
    payload?.configuration?.consensusThreshold ??
    payload?.consensus?.threshold ??
    null;
  const phases = [
    ...new Set(
      executions
        .flatMap(
          (execution) =>
            execution.genericAnalysis?.facts?.consensus?.points?.map(
              (point) => point?.phase,
            ) || [],
        )
        .filter(Number.isInteger),
    ),
  ].sort((left, right) => left - right);
  const series = executions
    .map((execution) => {
      const points = execution.genericAnalysis?.facts?.consensus?.points;
      const values = new Map(
        Array.isArray(points)
          ? points
              .filter(
                (point) =>
                  Number.isInteger(point?.phase) && finite(point?.value),
              )
              .map((point) => [point.phase, point.value])
          : [],
      );
      return {
        key: execution.key,
        label: execution.displayLabel,
        color: execution.color,
        data: phases.map((phase) => values.get(phase) ?? null),
      };
    })
    .filter((entry) => entry.data.some((value) => value !== null));
  const hasEvolution = series.some(
    (entry) => entry.data.filter((value) => value !== null).length >= 2,
  );
  return {
    enabled: hasEvolution,
    available: hasEvolution,
    graph: {
      labels: phases.map((phase) => `Phase ${phase}`),
      series,
      threshold: finite(threshold) ? threshold : null,
    },
  };
};

const buildSingleScatter = (execution) => {
  const normalized = normalizePlotsGraphic(
    storedExpertCollectiveProjection(execution),
  );
  return {
    available: Boolean(normalized?.isValid),
    unavailableReason: unavailableReason(normalized),
    // Single-execution rendering intentionally keeps the approved stored view;
    // absolute reconstruction is only needed to compare independent MDS frames.
    sourcePhase: execution?.sourcePhase ?? 0,
    data: normalized?.isValid
      ? {
          [execution?.sourcePhase ?? 0]: {
            expertPoints: normalized.expertPoints,
            collectivePoint: normalized.collectivePoint,
          },
        }
      : null,
  };
};

export const buildResultsVisualizationsData = ({ payload, executions }) => {
  const projections = executions.map((execution, slotIndex) =>
    buildCanonicalAnalyticalProjection({ execution, slotIndex }),
  );
  const consensus = buildConsensusVisualization(payload, executions);
  if (projections.length <= 1) {
    const projection = projections[0] || null;
    return {
      mode: "single",
      expertCollective: projection,
      canonicalProjections: projections,
      singleScatter: buildSingleScatter(executions[0]),
      consensus,
    };
  }
  const valid = projections.filter((projection) => projection.available);
  if (!valid.length) {
    const displayable = projections.filter(
      (projection) => projection.displayAvailable,
    );
    if (displayable.length)
      return {
        mode: "comparison",
        consensus,
        canonicalProjections: projections,
        expertCollectiveComparison: {
          available: true,
          presentation: "separate",
          groups: displayable.map((projection, index) =>
            visualGroup({
              id: `projection-group-${index + 1}`,
              projection,
              representative: projection,
              executions: [projection],
            }),
          ),
          alignedExecutions: [],
          separateExecutions: displayable.map((projection, index) =>
            visualGroup({
              id: `projection-group-${index + 1}`,
              projection,
              representative: projection,
              executions: [projection],
            }),
          ),
          unavailableExecutions: projections.filter(
            (projection) => !projection.available,
          ),
          footerMessages: [
            "The different stored projections could not be aligned safely, so each unique projection is shown separately.",
          ],
          footerMessage:
            "The different stored projections could not be aligned safely, so each unique projection is shown separately.",
          referenceGroupId: null,
        },
      };
    return {
      mode: "comparison",
      consensus,
      canonicalProjections: projections,
      expertCollectiveComparison: {
        available: false,
        presentation: "unavailable",
        groups: [],
        alignedExecutions: [],
        separateExecutions: [],
        unavailableExecutions: projections,
        footerMessages: [
          "No stored analytical projections are available for the selected executions.",
        ],
        footerMessage:
          "No stored analytical projections are available for the selected executions.",
        referenceGroupId: null,
      },
    };
  }
  const groups = groupEquivalentProjections(valid);
  if (valid.length === projections.length && groups.length === 1) {
    const sharedProjection = { ...visualGroup(groups[0]), legendLabel: null };
    return {
      mode: "comparison",
      consensus,
      canonicalProjections: projections,
      expertCollectiveComparison: {
        available: true,
        presentation: "shared",
        groups: [sharedProjection],
        sharedProjection,
        alignedExecutions: [],
        separateExecutions: [],
        unavailableExecutions: [],
        footerMessages: [sharedProjection.equalityMessage],
        footerMessage: sharedProjection.equalityMessage,
        referenceGroupId: groups[0].id,
      },
    };
  }
  const referenceGroup = groups[0];
  const reference = referenceGroup.representative;
  const alignedGroups = [];
  let alignmentFailed = !reference.available;
  for (const group of groups) {
    if (group.id === referenceGroup.id) alignedGroups.push(visualGroup(group));
    else {
      const alignment = alignProjectionToReference({
        reference,
        candidate: group.representative,
      });
      if (!alignment.available) alignmentFailed = true;
      else alignedGroups.push(visualGroup(group, alignment.alignedProjection));
    }
  }
  if (!alignmentFailed && valid.length === projections.length) {
    const footerMessages = [
      ...alignedGroups.map((group) => group.equalityMessage).filter(Boolean),
      "Different projections are aligned to the first selected projection for visual comparison.",
    ];
    return {
      mode: "comparison",
      consensus,
      canonicalProjections: projections,
      expertCollectiveComparison: {
        available: true,
        presentation: "aligned-overlay",
        groups: alignedGroups,
        alignedExecutions: alignedGroups,
        separateExecutions: [],
        unavailableExecutions: [],
        footerMessages,
        footerMessage: footerMessages.at(-1),
        referenceGroupId: referenceGroup.id,
      },
    };
  }
  const allGroups = [
    ...groupEquivalentProjections(valid).map((group) => visualGroup(group)),
    ...projections
      .filter(
        (projection) => !projection.available && projection.displayAvailable,
      )
      .map((projection, index) =>
        visualGroup({
          id: `unavailable-projection-${index + 1}`,
          projection,
          representative: projection,
          executions: [projection],
        }),
      ),
  ];
  const footerMessages = [
    "The different stored projections could not be aligned safely, so each unique projection is shown separately.",
  ];
  return {
    mode: "comparison",
    consensus,
    canonicalProjections: projections,
    expertCollectiveComparison: {
      available: allGroups.length > 0,
      presentation: "separate",
      groups: allGroups,
      alignedExecutions: [],
      separateExecutions: allGroups,
      unavailableExecutions: projections.filter(
        (projection) => !projection.available,
      ),
      footerMessages,
      footerMessage: footerMessages[0],
      referenceGroupId: referenceGroup.id,
    },
  };
};

export default buildResultsVisualizationsData;
