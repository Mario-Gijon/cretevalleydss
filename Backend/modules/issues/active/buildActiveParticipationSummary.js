import { createInternalError } from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import { ISSUE_STAGES } from "../shared/issueStages.js";

const validateParticipationExpertOrThrow = (participation) => {
  const expert = participation.expert;
  const expertId = expert ? toIdString(expert._id) : null;
  const expertEmail = expert && typeof expert.email === "string"
    ? expert.email.trim()
    : "";

  if (!expert || !expertId || expertEmail === "") {
    throw createInternalError("Participation expert data is invalid", {
      field: "participations.expert",
      details: {
        participationId: toIdString(participation._id),
      },
    });
  }

  return {
    expertId,
    expertEmail,
  };
};

export const buildActiveParticipationSummary = ({
  issueParticipations,
  userId,
  isIssueOwner,
  stage,
}) => {
  const validatedParticipations = issueParticipations.map((participation) => ({
    participation,
    ...validateParticipationExpertOrThrow(participation),
  }));

  const acceptedParticipationsWithExpert = validatedParticipations.filter(
    ({ participation }) => participation.invitationStatus === "accepted"
  );
  const pendingParticipationsWithExpert = validatedParticipations.filter(
    ({ participation }) => participation.invitationStatus === "pending"
  );
  const declinedParticipationsWithExpert = validatedParticipations.filter(
    ({ participation }) => participation.invitationStatus === "declined"
  );

  const acceptedParticipations = acceptedParticipationsWithExpert.map(
    ({ participation }) => participation
  );
  const pendingParticipations = pendingParticipationsWithExpert.map(
    ({ participation }) => participation
  );
  const declinedParticipations = declinedParticipationsWithExpert.map(
    ({ participation }) => participation
  );

  const hasPending = pendingParticipations.length > 0;
  const totalAccepted = acceptedParticipations.length;
  const completedWeightEvaluations = acceptedParticipations.filter(
    (participation) => participation.weightsCompleted
  ).length;
  const completedAlternativeEvaluations = acceptedParticipations.filter(
    (participation) => participation.evaluationCompleted
  ).length;

  const myParticipationEntry = validatedParticipations.find(({ expertId }) =>
    sameId(expertId, userId)
  );
  const myParticipation = myParticipationEntry?.participation;
  const acceptedUserParticipationEntry = acceptedParticipationsWithExpert.find(
    ({ expertId }) => sameId(expertId, userId)
  );
  const acceptedUserParticipation = acceptedUserParticipationEntry?.participation;
  const isExpertAccepted = acceptedUserParticipation !== undefined;

  let role = "viewer";
  if (isIssueOwner && isExpertAccepted) {
    role = "both";
  } else if (isIssueOwner) {
    role = "owner";
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

  const evaluated = validatedParticipations.some(
    ({ participation, expertId }) =>
      completedParticipations.includes(participation) && sameId(expertId, userId)
  );

  return {
    hasPending,
    totalAccepted,
    completedWeightEvaluations,
    completedAlternativeEvaluations,
    myParticipation,
    acceptedUserParticipation,
    isExpertAccepted,
    role,
    evaluated,
    totalExperts:
      totalAccepted +
      pendingParticipations.length +
      declinedParticipations.length,
    participatedExperts: validatedParticipations
      .filter(({ participation }) => completedParticipations.includes(participation))
      .map(({ expertEmail }) => expertEmail)
      .sort(),
    pendingExperts: pendingParticipationsWithExpert
      .map(({ expertEmail }) => expertEmail)
      .sort(),
    notAcceptedExperts: declinedParticipationsWithExpert
      .map(({ expertEmail }) => expertEmail)
      .sort(),
    acceptedButNotEvaluatedExperts: validatedParticipations
      .filter(({ participation }) =>
        pendingEvaluationParticipations.includes(participation)
      )
      .map(({ expertEmail }) => expertEmail)
      .sort(),
  };
};
