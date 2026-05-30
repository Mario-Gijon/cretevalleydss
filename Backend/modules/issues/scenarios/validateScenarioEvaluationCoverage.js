import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

export const validateEvaluationCoverageOrThrow = ({
  issue,
  phase,
  acceptedParticipations,
  completedEvaluations,
}) => {
  if (acceptedParticipations.length === 0) {
    throw createBadRequestError("No accepted experts found", {
      field: "participations",
    });
  }

  if (completedEvaluations.length !== acceptedParticipations.length) {
    throw createBadRequestError(
      "Completed alternative evaluations are missing for scenario execution",
      {
        field: "evaluations",
        details: {
          issueId: toIdString(issue._id),
          phase,
          expected: acceptedParticipations.length,
          received: completedEvaluations.length,
        },
      }
    );
  }

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

  for (const acceptedExpertId of acceptedExpertIds) {
    if (!completedExpertIds.has(acceptedExpertId)) {
      throw createBadRequestError(
        "Completed alternative evaluations are missing for one or more accepted experts",
        {
          field: "evaluations",
          details: {
            issueId: toIdString(issue._id),
            phase,
            expertId: acceptedExpertId,
          },
        }
      );
    }
  }
};
