import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";

export const buildFinishedCollectiveEvaluations = ({ stageResult }) => {
  const collectiveEvaluations = stageResult.collectiveEvaluations;

  if (!isPlainObject(collectiveEvaluations)) {
    throw createInternalError("IssueStageResult collectiveEvaluations must be an object", {
      field: "collectiveEvaluations",
      details: {
        issueId: toIdString(stageResult.issue),
        phase: stageResult.consensusPhase,
      },
    });
  }

  return collectiveEvaluations && Object.keys(collectiveEvaluations).length > 0
    ? collectiveEvaluations
    : null;
};
