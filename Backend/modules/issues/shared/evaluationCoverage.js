import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

const requireExpertId = ({ record, source, issueId = null, phase = null }) => {
  const expertId = toIdString(record?.expert?._id || record?.expert);

  if (!expertId) {
    throw createInternalError(`${source} expert id is invalid`, {
      field: `${source}.expert`,
      details: {
        issueId,
        phase,
        recordId: toIdString(record?._id) || null,
      },
    });
  }

  return expertId;
};

export const getAcceptedExpertsMissingCompletedEvaluations = ({
  acceptedParticipations,
  completedEvaluations,
  issueId = null,
  phase = null,
}) => {
  const acceptedExpertIds = new Set(
    acceptedParticipations.map((participation) =>
      requireExpertId({
        record: participation,
        source: "participations",
        issueId,
        phase,
      })
    )
  );

  const completedExpertIds = new Set(
    completedEvaluations.map((evaluation) =>
      requireExpertId({
        record: evaluation,
        source: "evaluations",
        issueId,
        phase,
      })
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
