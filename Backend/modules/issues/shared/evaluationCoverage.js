import { toIdString } from "../../../utils/common/ids.js";

export const getAcceptedExpertsMissingCompletedEvaluations = ({
  acceptedParticipations,
  completedEvaluations,
}) => {
  const acceptedExpertIds = new Set(
    acceptedParticipations.map((participation) =>
      toIdString(participation?.expert?._id || participation?.expert)
    )
  );

  const completedExpertIds = new Set(
    completedEvaluations.map((evaluation) =>
      toIdString(evaluation?.expert?._id || evaluation?.expert)
    )
  );

  const missingExpertIds = [];
  for (const acceptedExpertId of acceptedExpertIds) {
    if (!completedExpertIds.has(acceptedExpertId)) {
      missingExpertIds.push(acceptedExpertId);
    }
  }

  return {
    missingExpertIds,
    acceptedExpertIds: Array.from(acceptedExpertIds),
    completedExpertIds: Array.from(completedExpertIds),
  };
};
