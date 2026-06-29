import { Participation } from "../../../models/Participations.js";
import { createForbiddenError } from "../../../utils/common/errors.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";

const requireParticipationEntryWindowOrThrow = ({
  participation,
  issue,
  stage,
}) => {
  const entryPhase = participation?.entryPhase;
  const entryStage = participation?.entryStage;
  const currentPhase = issue?.consensusPhase;

  if (
    entryPhase === null ||
    entryPhase === undefined ||
    entryStage === null ||
    entryStage === undefined
  ) {
    return;
  }

  if (
    !Number.isInteger(entryPhase) ||
    entryPhase < 0 ||
    typeof entryStage !== "string" ||
    entryStage.trim() === ""
  ) {
    return;
  }

  if (entryPhase > currentPhase) {
    throw createForbiddenError(
      "You are not allowed to evaluate this issue stage for your participation entry window",
      {
        code: "PARTICIPATION_ENTRY_WINDOW_BLOCKS_EVALUATION",
        field: "stage",
        details: {
          entryPhase,
          entryStage,
          currentConsensusPhase: currentPhase,
          requestedStage: stage,
        },
      }
    );
  }

  if (
    entryPhase === currentPhase &&
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING &&
    entryStage !== EVALUATION_STAGES.CRITERIA_WEIGHTING
  ) {
    throw createForbiddenError(
      "You are not allowed to evaluate this issue stage for your participation entry window",
      {
        code: "PARTICIPATION_ENTRY_WINDOW_BLOCKS_EVALUATION",
        field: "stage",
        details: {
          entryPhase,
          entryStage,
          currentConsensusPhase: currentPhase,
          requestedStage: stage,
        },
      }
    );
  }
};

export const requireAcceptedParticipation = async ({
  issueId,
  userId,
  issue = null,
  stage = null,
  session = null,
}) => {
  const participation = await Participation.findOne({
    issue: issueId,
    expert: userId,
    invitationStatus: "accepted",
  }).session(session);

  if (!participation) {
    throw createForbiddenError(
      "You are not an accepted participant for this issue",
      {
        field: "userId",
      }
    );
  }

  if (issue && stage) {
    requireParticipationEntryWindowOrThrow({
      participation,
      issue,
      stage,
    });
  }

  return participation;
};

export const markParticipationCompleted = async ({
  issueId,
  userId,
  stage,
  session = null,
}) => {
  const completionUpdate =
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING
      ? { weightsCompleted: true }
      : { evaluationCompleted: true };

  const updatedParticipation = await Participation.findOneAndUpdate(
    {
      issue: issueId,
      expert: userId,
      invitationStatus: "accepted",
    },
    {
      $set: completionUpdate,
    },
    {
      new: true,
      session,
    }
  );

  if (!updatedParticipation) {
    throw createForbiddenError(
      "You are no longer an accepted participant for this issue",
      {
        field: "userId",
      }
    );
  }
};
