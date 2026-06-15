import { getIssueByIdOrThrow } from "../shared/queries.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import { getEvaluationStructureOrThrow } from "../../decisionPlugins/evaluations/evaluationStructureRegistry.js";
import { requireAcceptedParticipation } from "./issueEvaluationParticipation.js";

const getStructureForIssueStage = ({ issue, stage }) => {
  const structureKeyByStage = {
    [EVALUATION_STAGES.CRITERIA_WEIGHTING]:
      issue.criteriaWeightingStructureKey,
    [EVALUATION_STAGES.ALTERNATIVE_EVALUATION]:
      issue.alternativeEvaluationStructureKey,
  };

  return getEvaluationStructureOrThrow(structureKeyByStage[stage]);
};

export const loadIssueEvaluationContext = async ({
  issueId,
  userId,
  stage,
  session = null,
}) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    lean: false,
    session,
  });

  if (issue.currentStage !== stage) {
    throw createBadRequestError(
      `Issue is not currently accepting '${stage}' evaluations`,
      {
        code: "ISSUE_STAGE_NOT_ACCEPTING_EVALUATIONS",
        field: "stage",
        details: {
          currentStage: issue.currentStage,
          requestedStage: stage,
        },
      }
    );
  }

  await requireAcceptedParticipation({
    issueId: issue._id,
    userId,
    session,
  });

  return {
    issue,
    structure: getStructureForIssueStage({ issue, stage }),
  };
};
