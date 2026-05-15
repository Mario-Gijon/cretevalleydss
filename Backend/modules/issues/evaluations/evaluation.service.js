import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";
import { getIssueByIdOrThrow } from "../issue.queries.js";
import {
  createBadRequestError,
  createForbiddenError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { EVALUATION_STAGES } from "./evaluation.constants.js";
import { getIssueEvaluationStructureForStageOrThrow } from "./evaluation.registry.js";
import { resolveEvaluationComputeLifecycle } from "./evaluation.lifecycle.js";



const SUPPORTED_ISSUE_WORKFLOW_STAGES = new Set([
  EVALUATION_STAGES.CRITERIA_WEIGHTING,
  "weightsFinished",
  EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
  EVALUATION_STAGES.ALTERNATIVE_CONSENSUS,
  "finished",
]);

const assertIssueAcceptsStageOrThrow = ({ issue, stage }) => {
  if (!issueAcceptsEvaluationStage({ issue, stage })) {
    throw createBadRequestError(
      `Issue is not currently accepting '${stage}' evaluations`,
      {
        code: "ISSUE_STAGE_NOT_ACCEPTING_EVALUATIONS",
        field: "stage",
        details: {
          currentStage: issue.currentStage,
          requestedStage: stage,
        },
      }
    );
  }
};

const issueAcceptsEvaluationStage = ({ issue, stage }) => {
  if (issue.currentStage === stage) return true;

  return (
    stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION &&
    issue.currentStage === EVALUATION_STAGES.ALTERNATIVE_CONSENSUS_STAGE
  );
};

const resolveCurrentConsensusPhaseOrThrow = (issue) => {
  const phase = issue?.consensusPhase;

  if (!Number.isInteger(phase) || phase < 1) {
    throw createInternalError("Issue consensusPhase is invalid", {
      field: "consensusPhase",
      details: {
        issueId: issue?._id ?? null,
        consensusPhase: phase ?? null,
      },
    });
  }

  return phase;
};

const getAcceptedParticipationOrThrow = async ({ issueId, userId }) => {
  const acceptedCount = await Participation.countDocuments({
    issue: issueId,
    invitationStatus: "accepted",
  });

  if (acceptedCount === 0) {
    throw createBadRequestError(
      "Issue has no accepted participations for expert evaluations",
      {
        code: "NO_ACCEPTED_PARTICIPATIONS",
        field: "issueId",
      }
    );
  }

  const participation = await Participation.findOne({
    issue: issueId,
    expert: userId,
    invitationStatus: "accepted",
  });

  if (!participation) {
    throw createForbiddenError(
      "You are not an accepted participant for this issue",
      {
        field: "userId",
      }
    );
  }

  return participation;
};

const loadEvaluationContextOrThrow = async ({ issueId, userId, stage }) => {
  const issue = await getIssueByIdOrThrow(issueId, { lean: false });
  const structure = getIssueEvaluationStructureForStageOrThrow({ issue, stage });

  assertIssueAcceptsStageOrThrow({ issue, stage });

  const participation = await getAcceptedParticipationOrThrow({
    issueId: issue._id,
    userId,
  });

  const phase = resolveCurrentConsensusPhaseOrThrow(issue);

  return {
    issue,
    structure,
    participation,
    phase,
  };
};

const loadComputeContextOrThrow = async ({ issueId, userId, stage }) => {
  const issue = await getIssueByIdOrThrow(issueId, { lean: false });
  const structure = getIssueEvaluationStructureForStageOrThrow({ issue, stage });

  if (String(issue?.admin || "") !== String(userId || "")) {
    throw createForbiddenError("Only issue admin can compute evaluation stages", {
      field: "userId",
    });
  }

  const phase = resolveCurrentConsensusPhaseOrThrow(issue);

  if (
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING &&
    issue.currentStage !== "weightsFinished"
  ) {
    throw createBadRequestError(
      `Issue is not currently ready to compute '${stage}'`,
      {
        code: "ISSUE_STAGE_NOT_READY_TO_COMPUTE",
        field: "stage",
        details: {
          currentStage: issue.currentStage,
          requestedStage: stage,
        },
      }
    );
  }

  if (
    stage === EVALUATION_STAGES.ALTERNATIVE_EVALUATION &&
    !issueAcceptsEvaluationStage({ issue, stage })
  ) {
    throw createBadRequestError(
      `Issue is not currently ready to compute '${stage}'`,
      {
        code: "ISSUE_STAGE_NOT_READY_TO_COMPUTE",
        field: "stage",
        details: {
          currentStage: issue.currentStage,
          requestedStage: stage,
        },
      }
    );
  }

  return {
    issue,
    structure,
    phase,
  };
};

const findStoredEvaluation = async ({ issueId, userId, stage, phase }) => {
  return IssueEvaluation.findOne({
    issue: issueId,
    expert: userId,
    stage,
    consensusPhase: phase,
  });
};

const upsertIssueEvaluation = async ({
  issueId,
  userId,
  stage,
  phase,
  payload,
  completed,
  submittedAt,
}) => {
  return IssueEvaluation.findOneAndUpdate(
    {
      issue: issueId,
      expert: userId,
      stage,
      consensusPhase: phase,
    },
    {
      $set: {
        payload,
        completed,
        submittedAt,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

const updateParticipationCompletion = async ({ issueId, userId, stage }) => {
  const update =
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
      $set: update,
    },
    {
      new: true,
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

  return updatedParticipation;
};

const maybeAdvanceIssueStageAfterSubmit = async ({ issue, stage }) => {
  if (stage !== EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    return;
  }

  const acceptedParticipations = await Participation.find({
    issue: issue._id,
    invitationStatus: "accepted",
  })
    .select("weightsCompleted")
    .lean();

  if (acceptedParticipations.length === 0) {
    throw createBadRequestError(
      "Issue has no accepted participations for expert evaluations",
      {
        code: "NO_ACCEPTED_PARTICIPATIONS",
        field: "issueId",
      }
    );
  }

  const allWeightsCompleted = acceptedParticipations.every(
    (participation) => participation?.weightsCompleted === true
  );

  if (allWeightsCompleted && issue.currentStage === EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    issue.currentStage = "weightsFinished";
    await issue.save();
  }
};

const loadAcceptedParticipationsForComputeOrThrow = async ({ issueId, stage }) => {
  const participations = await Participation.find({
    issue: issueId,
    invitationStatus: "accepted",
  });

  if (participations.length === 0) {
    throw createBadRequestError(
      "Issue has no accepted participations for expert evaluations",
      {
        code: "NO_ACCEPTED_PARTICIPATIONS",
        field: "issueId",
      }
    );
  }

  const pendingParticipations = participations.filter((participation) => {
    if (stage === EVALUATION_STAGES.CRITERIA_WEIGHTING) {
      return participation?.weightsCompleted !== true;
    }

    return participation?.evaluationCompleted !== true;
  });

  if (pendingParticipations.length > 0) {
    throw createBadRequestError(
      "Not all accepted experts have completed the requested evaluation stage",
      {
        code: "EVALUATION_STAGE_NOT_COMPLETED_BY_ALL_EXPERTS",
        field: "stage",
        details: {
          stage,
          pendingExpertIds: pendingParticipations.map((participation) =>
            String(participation.expert)
          ),
        },
      }
    );
  }

  return participations;
};

const loadCompletedEvaluationsForComputeOrThrow = async ({
  issueId,
  stage,
  phase,
  participations,
}) => {
  const evaluations = await IssueEvaluation.find({
    issue: issueId,
    stage,
    consensusPhase: phase,
    completed: true,
  }).populate("expert", "name email");

  const expectedExperts = new Set(
    participations.map((participation) => String(participation.expert))
  );
  const completedExperts = new Set(
    evaluations.map((evaluation) => String(evaluation.expert?._id || evaluation.expert))
  );

  const missingExperts = [...expectedExperts].filter(
    (expertId) => !completedExperts.has(expertId)
  );

  if (
    evaluations.length !== participations.length ||
    missingExperts.length > 0
  ) {
    throw createBadRequestError(
      "Completed evaluation documents are missing for the requested stage",
      {
        code: "COMPLETED_EVALUATIONS_MISSING",
        field: "stage",
      }
    );
  }

  return evaluations;
};

const resetAlternativeEvaluationCompletionForAcceptedParticipationsOrThrow =
  async ({ issueId }) => {
    const acceptedCount = await Participation.countDocuments({
      issue: issueId,
      invitationStatus: "accepted",
    });

    if (acceptedCount === 0) {
      throw createBadRequestError(
        "Issue has no accepted participations for expert evaluations",
        {
          code: "NO_ACCEPTED_PARTICIPATIONS",
          field: "issueId",
        }
      );
    }

    await Participation.updateMany(
      {
        issue: issueId,
        invitationStatus: "accepted",
      },
      {
        $set: {
          evaluationCompleted: false,
        },
      }
    );
  };

const normalizeComputeResult = (computeResult = {}) => {
  return {
    consensusMeasure: computeResult?.consensusMeasure ?? null,
    collectivePayload: computeResult?.collectivePayload ?? {},
    computedPayload: computeResult?.computedPayload ?? {},
    modelExecution: computeResult?.modelExecution ?? {},
    rawOutput: computeResult?.rawOutput ?? {},
    issueUpdates:
      computeResult?.issueUpdates &&
        typeof computeResult.issueUpdates === "object" &&
        !Array.isArray(computeResult.issueUpdates)
        ? computeResult.issueUpdates
        : {},
    nextCurrentStage: computeResult?.nextCurrentStage ?? null,
    message: computeResult?.message ?? "Evaluation stage computed successfully",
  };
};

const applyIssueComputeUpdatesOrThrow = async ({
  issue,
  issueUpdates,
  nextCurrentStage,
}) => {
  let changed = false;

  if (issueUpdates && typeof issueUpdates === "object") {
    Object.entries(issueUpdates).forEach(([key, value]) => {
      issue[key] = value;
      changed = true;
    });
  }

  if (nextCurrentStage !== null && nextCurrentStage !== undefined) {
    if (!SUPPORTED_ISSUE_WORKFLOW_STAGES.has(nextCurrentStage)) {
      throw createBadRequestError(
        `Unsupported next issue stage: ${nextCurrentStage}`,
        {
          code: "UNSUPPORTED_NEXT_ISSUE_STAGE",
          field: "nextCurrentStage",
        }
      );
    }

    issue.currentStage = nextCurrentStage;
    changed = true;
  }

  if (changed) {
    await issue.save();
  }
};

export const getIssueEvaluationPayload = async ({ issueId, userId, stage }) => {
  const { issue, structure, phase } = await loadEvaluationContextOrThrow({
    issueId,
    userId,
    stage,
  });

  const storedEvaluation = await findStoredEvaluation({
    issueId: issue._id,
    userId,
    stage,
    phase,
  });

  let payload;

  if (typeof structure.get === "function") {
    payload = await structure.get({
      storedEvaluation,
      issueId: issue._id,
      userId,
      issue,
      phase,
    });
  } else if (storedEvaluation) {
    payload = storedEvaluation.payload;
  } else if (typeof structure.init === "function") {
    payload = await structure.init({
      issueId: issue._id,
      userId,
      issue,
      phase,
    });
  } else {
    payload = {};
  }

  return {
    stage,
    structureKey: structure.key,
    consensusPhase: phase,
    payload,
    completed: storedEvaluation?.completed ?? false,
    submittedAt: storedEvaluation?.submittedAt ?? null,
  };
};

export const saveIssueEvaluationDraft = async ({
  issueId,
  userId,
  stage,
  payload,
}) => {
  const { issue, structure, phase } = await loadEvaluationContextOrThrow({
    issueId,
    userId,
    stage,
  });

  const normalizedPayload =
    typeof structure.send === "function"
      ? await structure.send({
        payload,
        issueId: issue._id,
        userId,
        issue,
        phase,
      })
      : payload;

  await upsertIssueEvaluation({
    issueId: issue._id,
    userId,
    stage,
    phase,
    payload: normalizedPayload,
    completed: false,
    submittedAt: null,
  });

  return {
    message: "Evaluation draft saved successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: phase,
    completed: false,
  };
};

export const submitIssueEvaluation = async ({
  issueId,
  userId,
  stage,
  payload,
}) => {
  const { issue, structure, phase } = await loadEvaluationContextOrThrow({
    issueId,
    userId,
    stage,
  });

  const normalizedPayload =
    typeof structure.submit === "function"
      ? await structure.submit({
        payload,
        issueId: issue._id,
        userId,
        issue,
        phase,
      })
      : payload;

  await upsertIssueEvaluation({
    issueId: issue._id,
    userId,
    stage,
    phase,
    payload: normalizedPayload,
    completed: true,
    submittedAt: new Date(),
  });

  await updateParticipationCompletion({
    issueId: issue._id,
    userId,
    stage,
  });

  await maybeAdvanceIssueStageAfterSubmit({ issue, stage });

  return {
    message: "Evaluation submitted successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: phase,
    completed: true,
    currentStage: issue.currentStage,
  };
};

export const computeIssueEvaluationStage = async ({
  issueId,
  userId,
  stage,
  apiModelsBaseUrl,
  httpClient,
}) => {
  const { issue, structure, phase } = await loadComputeContextOrThrow({
    issueId,
    userId,
    stage,
  });

  const participations = await loadAcceptedParticipationsForComputeOrThrow({
    issueId: issue._id,
    stage,
  });

  const evaluations = await loadCompletedEvaluationsForComputeOrThrow({
    issueId: issue._id,
    stage,
    phase,
    participations,
  });

  if (typeof structure.compute !== "function") {
    throw createBadRequestError(
      `Compute is not implemented for evaluation structure '${structure.key}'`,
      {
        code: "EVALUATION_STRUCTURE_COMPUTE_NOT_IMPLEMENTED",
        field: "structureKey",
        details: {
          structureKey: structure.key,
          stage,
        },
      }
    );
  }

  const rawComputeResult = await structure.compute({
    issue,
    issueId: issue._id,
    userId,
    stage,
    phase,
    evaluations,
    participations,
    apiModelsBaseUrl,
    httpClient,
  });

  const computeResult = normalizeComputeResult(rawComputeResult);
  const {
    computeResult: lifecycleComputeResult,
    resetAlternativeEvaluationCompletion,
  } = resolveEvaluationComputeLifecycle({
    issue,
    stage,
    computeResult,
  });

  await IssueStageResult.findOneAndUpdate(
    {
      issue: issue._id,
      stage,
      consensusPhase: phase,
    },
    {
      $set: {
        consensusMeasure: lifecycleComputeResult.consensusMeasure,
        collectivePayload: lifecycleComputeResult.collectivePayload,
        computedPayload: lifecycleComputeResult.computedPayload,
        modelExecution: lifecycleComputeResult.modelExecution,
        rawOutput: lifecycleComputeResult.rawOutput,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  await applyIssueComputeUpdatesOrThrow({
    issue,
    issueUpdates: lifecycleComputeResult.issueUpdates,
    nextCurrentStage: lifecycleComputeResult.nextCurrentStage,
  });

  if (resetAlternativeEvaluationCompletion) {
    await resetAlternativeEvaluationCompletionForAcceptedParticipationsOrThrow({
      issueId: issue._id,
    });
  }

  return {
    message: lifecycleComputeResult.message,
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    currentStage: issue.currentStage,
    result: {
      consensusMeasure: lifecycleComputeResult.consensusMeasure,
      collectivePayload: lifecycleComputeResult.collectivePayload,
      computedPayload: lifecycleComputeResult.computedPayload,
      modelExecution: lifecycleComputeResult.modelExecution,
      rawOutput: lifecycleComputeResult.rawOutput,
    },
  };
};
