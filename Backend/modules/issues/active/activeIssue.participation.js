import { sameId } from "../../../utils/common/ids.js";
import { ISSUE_STAGES } from "../evaluations/evaluation.constants.js";

export const buildActiveParticipationSummary = ({
  issueParticipations,
  userId,
  isAdminUser,
  stage,
}) => {
  const acceptedParticipations = issueParticipations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );
  const pendingParticipations = issueParticipations.filter(
    (participation) => participation.invitationStatus === "pending"
  );
  const declinedParticipations = issueParticipations.filter(
    (participation) => participation.invitationStatus === "declined"
  );

  const hasPending = pendingParticipations.length > 0;
  const totalAccepted = acceptedParticipations.length;
  const completedWeightEvaluations = acceptedParticipations.filter(
    (participation) => participation.weightsCompleted
  ).length;
  const completedAlternativeEvaluations = acceptedParticipations.filter(
    (participation) => participation.evaluationCompleted
  ).length;

  const myParticipation = issueParticipations.find((participation) =>
    sameId(participation.expert._id, userId)
  );
  const isExpertAccepted = acceptedParticipations.some((participation) =>
    sameId(participation.expert._id, userId)
  );

  let role = "viewer";
  if (isAdminUser && isExpertAccepted) {
    role = "both";
  } else if (isAdminUser) {
    role = "admin";
  } else if (isExpertAccepted) {
    role = "expert";
  }

  const isWeightEvaluationStage =
    stage === ISSUE_STAGES.CRITERIA_WEIGHTING ||
    stage === ISSUE_STAGES.WEIGHTS_FINISHED;

  let completedParticipations;
  let pendingEvaluationParticipations;

  if (isWeightEvaluationStage) {
    completedParticipations = acceptedParticipations.filter(
      (participation) => participation.weightsCompleted
    );
    pendingEvaluationParticipations = acceptedParticipations.filter(
      (participation) => !participation.weightsCompleted
    );
  } else {
    completedParticipations = acceptedParticipations.filter(
      (participation) => participation.evaluationCompleted
    );
    pendingEvaluationParticipations = acceptedParticipations.filter(
      (participation) => !participation.evaluationCompleted
    );
  }

  const evaluated = completedParticipations.some((participation) =>
    sameId(participation.expert._id, userId)
  );

  return {
    acceptedParticipations,
    hasPending,
    totalAccepted,
    completedWeightEvaluations,
    completedAlternativeEvaluations,
    myParticipation,
    isExpertAccepted,
    role,
    evaluated,
    totalExperts:
      totalAccepted +
      pendingParticipations.length +
      declinedParticipations.length,
    participatedExperts: completedParticipations
      .map((participation) => participation.expert.email)
      .sort(),
    pendingExperts: pendingParticipations
      .map((participation) => participation.expert.email)
      .sort(),
    notAcceptedExperts: declinedParticipations
      .map((participation) => participation.expert.email)
      .sort(),
    acceptedButNotEvaluatedExperts: pendingEvaluationParticipations
      .map((participation) => participation.expert.email)
      .sort(),
  };
};
