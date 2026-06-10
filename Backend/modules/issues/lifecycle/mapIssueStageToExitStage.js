import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

export const mapIssueStageToExitStage = (stage, { issueId = null } = {}) => {
  if (stage === "criteriaWeighting" || stage === "weightsFinished") {
    return "criteriaWeighting";
  }

  if (stage === "alternativeEvaluation" || stage === "finished") {
    return "alternativeEvaluation";
  }

  throw createInternalError("Issue currentStage is unsupported for exit logs", {
    field: "currentStage",
    details: {
      issueId: toIdString(issueId) || null,
      stage,
    },
  });
};
