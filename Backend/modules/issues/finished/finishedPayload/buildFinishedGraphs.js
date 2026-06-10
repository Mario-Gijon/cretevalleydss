import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";

const buildExpertLabelOrThrow = (evaluation) => {
  const expert = evaluation.expert;
  if (!expert || typeof expert !== "object") {
    throw createInternalError("Finished evaluation expert label is invalid", {
      field: "evaluations.expert",
      details: {
        issueId: toIdString(evaluation.issue),
        evaluationId: toIdString(evaluation._id),
      },
    });
  }

  const email = typeof expert.email === "string" ? expert.email.trim() : "";

  if (email) {
    return email;
  }

  const name = typeof expert.name === "string" ? expert.name.trim() : "";

  if (name) {
    return name;
  }

  throw createInternalError("Finished evaluation expert label is invalid", {
    field: "evaluations.expert",
    details: {
      issueId: toIdString(evaluation.issue),
      evaluationId: toIdString(evaluation._id),
    },
  });
};

export const enrichPlotsGraphicWithExpertLabels = ({
  plotsGraphic,
  evaluations,
}) => {
  const issueId = evaluations.length > 0 ? toIdString(evaluations[0].issue) : null;
  const rawExpertPoints = plotsGraphic.expert_points;

  if (rawExpertPoints !== undefined && !Array.isArray(rawExpertPoints)) {
    throw createInternalError("Finished plotsGraphic expert_points must be an array", {
      field: "plotsGraphic.expert_points",
      details: {
        issueId,
      },
    });
  }

  const expertPoints = rawExpertPoints === undefined ? [] : rawExpertPoints;
  const expertLabels = evaluations.map(buildExpertLabelOrThrow);

  for (let index = 0; index < expertPoints.length; index += 1) {
    const point = expertPoints[index];

    if (!Array.isArray(point) || point.length !== 2) {
      throw createInternalError("Finished plotsGraphic expert point is malformed", {
        field: `plotsGraphic.expert_points[${index}]`,
        details: {
          issueId,
        },
      });
    }
  }

  const expertPointsByEmail = {};
  const matchedLength = Math.min(expertPoints.length, expertLabels.length);

  for (let index = 0; index < matchedLength; index += 1) {
    const label = expertLabels[index];
    const point = expertPoints[index];

    expertPointsByEmail[label] = point;
  }

  return {
    ...plotsGraphic,
    expert_labels: expertLabels,
    expert_points_by_email: expertPointsByEmail,
  };
};
