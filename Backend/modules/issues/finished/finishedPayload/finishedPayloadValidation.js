import {
  createBadRequestError,
  createInternalError,
} from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { getAcceptedExpertsMissingCompletedEvaluations } from "../../shared/evaluationCoverage.js";

export const normalizeConsensusPhaseOrThrow = ({ value, issueId, stage }) => {
  if (!Number.isInteger(value) || value < 0) {
    throw createInternalError("IssueStageResult has invalid consensusPhase", {
      field: "consensusPhase",
      details: {
        issueId: toIdString(issueId),
        stage,
        consensusPhase: value ?? null,
      },
    });
  }

  return value;
};

export const validateAcceptedEvaluationCoverageOrThrow = ({
  acceptedParticipations,
  completedEvaluations,
  issue,
  phase,
}) => {
  if (acceptedParticipations.length === 0) {
    throw createBadRequestError("Finished issue has no accepted experts", {
      field: "participations",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  if (completedEvaluations.length !== acceptedParticipations.length) {
    throw createInternalError(
      "Completed alternative evaluations are missing for the finished issue stage",
      {
        field: "evaluations",
        details: {
          issueId: toIdString(issue?._id),
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
    issueId: toIdString(issue?._id),
    phase,
  });

  if (missingExpertIds.length > 0) {
    throw createInternalError(
      "Completed alternative evaluations are missing for one or more experts",
      {
        field: "evaluations",
        details: {
          issueId: toIdString(issue?._id),
          phase,
          expertId: missingExpertIds[0],
        },
      }
    );
  }
};
