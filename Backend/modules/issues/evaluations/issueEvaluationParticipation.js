import { Participation } from "../../../models/Participations.js";
import { createForbiddenError } from "../../../utils/common/errors.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";

export const requireAcceptedParticipation = async ({
  issueId,
  userId,
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
