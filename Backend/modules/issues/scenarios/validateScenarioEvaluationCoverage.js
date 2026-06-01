import { createBadRequestError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { getAcceptedExpertsMissingCompletedEvaluations } from "../shared/evaluationCoverage.js";

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

  const { missingExpertIds } = getAcceptedExpertsMissingCompletedEvaluations({
    acceptedParticipations,
    completedEvaluations,
  });

  if (missingExpertIds.length > 0) {
    throw createBadRequestError(
      "Completed alternative evaluations are missing for one or more accepted experts",
      {
        field: "evaluations",
        details: {
          issueId: toIdString(issue._id),
          phase,
          expertId: missingExpertIds[0],
        },
      }
    );
  }
};
