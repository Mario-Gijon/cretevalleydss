import { Criterion } from "../../../models/Criteria.js";
import { Participation } from "../../../models/Participations.js";
import { ISSUE_STAGES } from "../shared/issueStages.js";
import {
  buildParticipationEntryMetadata,
  isSingleLeafCriterionCount,
} from "../shared/participantEntry.js";
import { getIssueByIdOrThrow } from "../shared/queries.js";

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

  const issue = await getIssueByIdOrThrow(issueId, {
    select:
      "_id name currentStage consensusPhase criteriaWeightsStructureKey",
    lean: false,
    session,
  });

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
    const leafCriteriaCount = await Criterion.countDocuments({
      issue: issue._id,
      isLeaf: true,
    }).session(session);
    const isSingleCriterion = isSingleLeafCriterionCount(leafCriteriaCount);
    const criteriaWeightingIsOpen =
      issue.currentStage === ISSUE_STAGES.CRITERIA_WEIGHTING ||
      issue.currentStage === ISSUE_STAGES.WEIGHTS_FINISHED;
    const requiresCriteriaWeighting =
      issue.criteriaWeightsStructureKey !== null &&
      issue.criteriaWeightsStructureKey !== undefined;

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
