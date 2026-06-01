import { Issue } from "../../../models/Issues.js";
import { Participation } from "../../../models/Participations.js";
import { ISSUE_STAGES } from "../../decisionEngine/evaluations/evaluation.constants.js";
import {
  buildParticipationEntryMetadata,
  isSingleLeafCriterionCount,
} from "../shared/participantEntry.js";

import {
  createBadRequestError,
  createNotFoundError,
} from "../../../utils/common/errors.js";

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
    const leafCriteriaCount = issue.leafCriteriaOrder.length;
    const isSingleCriterion = isSingleLeafCriterionCount(leafCriteriaCount);
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
    const participationEntryMetadata = buildParticipationEntryMetadata({ issue });
    participation.joinedAt = participationEntryMetadata.joinedAt;
    participation.entryPhase = participationEntryMetadata.entryPhase;
    participation.entryStage = participationEntryMetadata.entryStage;
  }

  await participation.save({ session });

  return {
    message:
      action === "accepted"
        ? `Invitation to issue ${issue.name} accepted`
        : `Invitation to issue ${issue.name} declined`,
  };
};
