import { Participation } from "../../../models/Participations.js";
import { createForbiddenError } from "../../../utils/common/errors.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import { ISSUE_STAGES } from "../shared/issueStages.js";

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

export const advanceToWeightsFinishedAfterSubmit = async ({
  issue,
  stage,
  session = null,
}) => {
  if (stage !== EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    return;
  }

  const participations = await Participation.find({
    issue: issue._id,
  })
    .select("expert invitationStatus weightsCompleted")
    .session(session)
    .lean();

  const pendingParticipations = participations.filter(
    (participation) => participation.invitationStatus === "pending"
  );
  if (pendingParticipations.length > 0) {
    return;
  }

  const acceptedParticipations = participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );
  if (acceptedParticipations.length === 0) {
    return;
  }

  const allWeightsCompleted = acceptedParticipations.every(
    (participation) => participation.weightsCompleted === true
  );

  if (
    allWeightsCompleted &&
    issue.currentStage === ISSUE_STAGES.CRITERIA_WEIGHTING
  ) {
    issue.currentStage = ISSUE_STAGES.WEIGHTS_FINISHED;
    await issue.save({ session });
  }
};
