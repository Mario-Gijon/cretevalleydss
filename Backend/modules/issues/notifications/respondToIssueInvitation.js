import { Issue } from "../../../models/Issues.js";
import { Participation } from "../../../models/Participations.js";
import { ISSUE_STAGES } from "../../decisionEngine/evaluations/evaluation.constants.js";

import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";

const PARTICIPATION_ENTRY_STAGES = Object.freeze({
  CRITERIA_WEIGHTING: "criteriaWeighting",
  ALTERNATIVE_EVALUATION: "alternativeEvaluation",
});

const resolveParticipationEntryStage = (issueStage) => {
  if (
    issueStage === ISSUE_STAGES.CRITERIA_WEIGHTING ||
    issueStage === ISSUE_STAGES.WEIGHTS_FINISHED
  ) {
    return PARTICIPATION_ENTRY_STAGES.CRITERIA_WEIGHTING;
  }

  if (
    issueStage === ISSUE_STAGES.ALTERNATIVE_EVALUATION ||
    issueStage === ISSUE_STAGES.FINISHED
  ) {
    return PARTICIPATION_ENTRY_STAGES.ALTERNATIVE_EVALUATION;
  }

  return null;
};

export const respondToIssueInvitation = async ({
  issueId,
  userId,
  action,
  session = null,
}) => {
  if (!issueId) {
    throw createBadRequestError("Issue id is required");
  }

  if (action !== "accepted" && action !== "declined") {
    throw createBadRequestError("Invalid invitation action", {
      field: "action",
    });
  }

  const issue = await Issue.findById(issueId)
    .select(
      "_id name currentStage consensusPhase criteriaWeightingStructureKey leafCriteriaOrder"
    )
    .session(session);

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  const participation = await Participation.findOne({
    issue: issue._id,
    expert: userId,
  }).session(session);

  if (!participation) {
    throw createNotFoundError(
      "No participation found for the user in this issue"
    );
  }

  participation.invitationStatus = action;

  if (action === "accepted") {
    const leafCriteriaCount = Array.isArray(issue.leafCriteriaOrder)
      ? issue.leafCriteriaOrder.length
      : 0;
    const isSingleCriterion = leafCriteriaCount === 1;
    const criteriaWeightingIsOpen =
      issue.currentStage === ISSUE_STAGES.CRITERIA_WEIGHTING ||
      issue.currentStage === ISSUE_STAGES.WEIGHTS_FINISHED;
    const requiresCriteriaWeighting =
      issue.criteriaWeightingStructureKey !== null &&
      issue.criteriaWeightingStructureKey !== undefined;

    participation.evaluationCompleted = false;
    if (criteriaWeightingIsOpen && requiresCriteriaWeighting) {
      participation.weightsCompleted = isSingleCriterion;
    }
    participation.joinedAt = new Date();
    participation.entryPhase = Number.isInteger(issue.consensusPhase)
      ? issue.consensusPhase
      : null;
    participation.entryStage = resolveParticipationEntryStage(issue.currentStage);
  }

  await participation.save({ session });

  return {
    message:
      action === "accepted"
        ? `Invitation to issue ${issue.name} accepted`
        : `Invitation to issue ${issue.name} declined`,
  };
};
