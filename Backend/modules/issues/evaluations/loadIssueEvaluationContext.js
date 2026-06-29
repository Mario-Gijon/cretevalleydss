import { getIssueByIdOrThrow } from "../shared/queries.js";
import { createBadRequestError } from "../../../utils/common/errors.js";
import {
  EVALUATION_STAGES,
  EVALUATION_STAGE_VALUES,
} from "../../decisionPlugins/evaluations/evaluationStages.js";
import { getEvaluationStructureOrThrow } from "../../decisionPlugins/evaluations/evaluationStructureRegistry.js";
import { requireAcceptedParticipation } from "./issueEvaluationParticipation.js";

const getStructureForIssueStage = ({ issue, stage }) => {
  const structureKeyByStage = {
    [EVALUATION_STAGES.CRITERIA_WEIGHTING]:
      issue.criteriaWeightsStructureKey,
    [EVALUATION_STAGES.ALTERNATIVE_EVALUATION]:
      issue.evaluationStructureKey,
  };

  return getEvaluationStructureOrThrow(structureKeyByStage[stage]);
};

export const loadIssueEvaluationContext = async ({
  issueId,
  userId,
  stage,
  session = null,
}) => {
  if (!EVALUATION_STAGE_VALUES.includes(stage)) {
    throw createBadRequestError("Unsupported evaluation stage", {
      code: "UNSUPPORTED_EVALUATION_STAGE",
      field: "stage",
      details: {
        requestedStage: stage,
      },
    });
  }

  const issue = await getIssueByIdOrThrow(issueId, {
    lean: false,
    session,
  });

  if (issue.active !== true) {
    throw createBadRequestError("Issue is not active", {
      code: "ISSUE_NOT_ACTIVE",
      field: "issueId",
      details: {
        currentStage: issue.currentStage,
      },
    });
  }

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
    issue,
    stage,
    session,
  });

  return {
    issue,
    structure: getStructureForIssueStage({ issue, stage }),
  };
};
