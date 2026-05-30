import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";

export const enrichPlotsGraphicWithExpertLabels = ({
  plotsGraphic,
  evaluations,
}) => {
  if (!isPlainObject(plotsGraphic)) {
    return plotsGraphic;
  }

  const expertPoints = Array.isArray(plotsGraphic.expert_points)
    ? plotsGraphic.expert_points
    : [];

  const expertLabels = (Array.isArray(evaluations) ? evaluations : [])
    .map((evaluation) => {
      const email = evaluation?.expert?.email;
      if (typeof email === "string" && email.trim()) {
        return email.trim();
      }

      const name = evaluation?.expert?.name;
      if (typeof name === "string" && name.trim()) {
        return name.trim();
      }

      const expertId = toIdString(evaluation?.expert?._id || evaluation?.expert);
      return expertId ? `expert_${expertId}` : null;
    })
    .filter(Boolean);

  const expertPointsByEmail = {};
  const matchedLength = Math.min(expertPoints.length, expertLabels.length);

  for (let index = 0; index < matchedLength; index += 1) {
    const label = expertLabels[index];
    const point = expertPoints[index];
    if (!label || !Array.isArray(point) || point.length !== 2) {
      continue;
    }
    expertPointsByEmail[label] = point;
  }

  return {
    ...plotsGraphic,
    expert_labels: expertLabels,
    expert_points_by_email: expertPointsByEmail,
  };
};
