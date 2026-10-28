import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";
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

export const assertExactEvaluationCoverageOrThrow = ({
  acceptedParticipations,
  completedEvaluations,
  issueId = null,
  phase = null,
}) => {
  const acceptedExpertIds = acceptedParticipations.map((participation) =>
    requireExpertId({
      record: participation,
      source: "participations",
      issueId,
      phase,
    })
  );
  const completedExpertIds = completedEvaluations.map((evaluation) =>
    requireExpertId({
      record: evaluation,
      source: "evaluations",
      issueId,
      phase,
    })
  );
  const expected = new Set(acceptedExpertIds);
  const received = new Set(completedExpertIds);
  const duplicateAcceptedExpertIds = acceptedExpertIds.filter(
    (expertId, index) => acceptedExpertIds.indexOf(expertId) !== index
  );
  const duplicateEvaluationExpertIds = completedExpertIds.filter(
    (expertId, index) => completedExpertIds.indexOf(expertId) !== index
  );
  const missingExpertIds = [...expected].filter((expertId) => !received.has(expertId));
  const unexpectedExpertIds = [...received].filter((expertId) => !expected.has(expertId));
  const incompleteExpertIds = completedEvaluations
    .filter((evaluation) => evaluation?.completed !== true)
    .map((evaluation) =>
      requireExpertId({
        record: evaluation,
        source: "evaluations",
        issueId,
        phase,
      })
    );

  if (
    duplicateAcceptedExpertIds.length ||
    duplicateEvaluationExpertIds.length ||
    missingExpertIds.length ||
    unexpectedExpertIds.length ||
    incompleteExpertIds.length ||
    completedEvaluations.length !== acceptedParticipations.length
  ) {
    throw createBadRequestError(
      "AHPSort I requires exactly one completed evaluation from every accepted expert in the requested phase.",
      {
        code: "AHPSORT_I_EVALUATION_COVERAGE_MISMATCH",
        field: "evaluations",
        details: {
          issueId,
          phase,
          expectedExpertIds: [...expected].sort(),
          receivedExpertIds: [...received].sort(),
          missingExpertIds: [...new Set(missingExpertIds)].sort(),
          unexpectedExpertIds: [...new Set(unexpectedExpertIds)].sort(),
          duplicateAcceptedExpertIds: [...new Set(duplicateAcceptedExpertIds)].sort(),
          duplicateEvaluationExpertIds: [...new Set(duplicateEvaluationExpertIds)].sort(),
          incompleteExpertIds: [...new Set(incompleteExpertIds)].sort(),
        },
      }
    );
  }

  return {
    expectedExpertIds: [...expected],
    receivedExpertIds: [...received],
  };
};
