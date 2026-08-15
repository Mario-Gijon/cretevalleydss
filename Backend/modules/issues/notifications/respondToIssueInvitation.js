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
import {
  createIssueEventOperationMetadata,
  ISSUE_EVENT_TYPES,
  snapshotParticipation,
  writeIssueEvent,
} from "../events/index.js";
import { mapIssueStageToExitStage } from "../lifecycle/mapIssueStageToExitStage.js";

export const respondToIssueInvitation = async ({
  issueId,
  userId,
  action,
  correlationId = null,
  occurredAt = null,
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

  const eventMetadata =
    correlationId && occurredAt
      ? { correlationId, occurredAt }
      : createIssueEventOperationMetadata();
  const previousState = snapshotParticipation(participation);
  const wasAccepted = participation.invitationStatus === "accepted";

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
    const participationEntryMetadata = buildParticipationEntryMetadata({
      issue,
      occurredAt: eventMetadata.occurredAt,
    });
    participation.joinedAt = participationEntryMetadata.joinedAt;
    participation.entryPhase = participationEntryMetadata.entryPhase;
    participation.entryStage = participationEntryMetadata.entryStage;
  }

  await participation.save({ session });
  const nextState = snapshotParticipation(participation);
  const eventBase = {
    issueId: issue._id,
    actorType: "user",
    actorUser: userId,
    subjectUser: userId,
    entityType: "participation",
    entityId: participation._id,
    stage:
      participation.entryStage ??
      mapIssueStageToExitStage(issue.currentStage, { issueId: issue._id }),
    phase: participation.entryPhase ?? issue.consensusPhase,
    occurredAt: eventMetadata.occurredAt,
    correlationId: eventMetadata.correlationId,
    previousState,
    nextState,
    session,
  };

  await writeIssueEvent({
    ...eventBase,
    eventType:
      action === "accepted"
        ? ISSUE_EVENT_TYPES.INVITATION_ACCEPTED
        : ISSUE_EVENT_TYPES.INVITATION_DECLINED,
  });

  if (action === "accepted" && !wasAccepted) {
    await writeIssueEvent({
      ...eventBase,
      eventType: ISSUE_EVENT_TYPES.PARTICIPATION_ENTERED,
    });
  }

  return {
    message:
      action === "accepted"
        ? `Invitation to issue ${issue.name} accepted`
        : `Invitation to issue ${issue.name} declined`,
  };
};
