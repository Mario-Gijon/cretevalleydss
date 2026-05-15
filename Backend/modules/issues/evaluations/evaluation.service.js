import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { Participation } from "../../../models/Participations.js";
import { getIssueByIdOrThrow } from "../issue.queries.js";
import {
  createBadRequestError,
  createForbiddenError,
} from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import {
  EVALUATION_STAGES,
  ISSUE_STAGES,
} from "./evaluation.constants.js";
import { getEvaluationStructureOrThrow } from "./evaluation.registry.js";
import { resolveEvaluationComputeLifecycle } from "./evaluation.lifecycle.js";

const getStructureForIssueStage = ({ issue, stage }) => {
  const structureKeyByStage = {
    [EVALUATION_STAGES.CRITERIA_WEIGHTING]:
      issue.criteriaWeightingStructureKey,
    [EVALUATION_STAGES.ALTERNATIVE_EVALUATION]:
      issue.alternativeEvaluationStructureKey,
  };

  return getEvaluationStructureOrThrow(structureKeyByStage[stage]);
};

const requireAcceptedParticipation = async ({ issueId, userId }) => {
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
};

const loadEvaluationContext = async ({ issueId, userId, stage }) => {
  const issue = await getIssueByIdOrThrow(issueId, { lean: false });

  if (issue.currentStage !== stage) {
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

  await requireAcceptedParticipation({
    issueId: issue._id,
    userId,
  });

  return {
    issue,
    structure: getStructureForIssueStage({ issue, stage }),
  };
};

const loadComputeContext = async ({ issueId, userId, stage }) => {
  const issue = await getIssueByIdOrThrow(issueId, { lean: false });

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError("Only issue admin can compute evaluation stages", {
      field: "userId",
    });
  }

  const expectedCurrentStage =
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING
      ? ISSUE_STAGES.WEIGHTS_FINISHED
      : stage;

  if (issue.currentStage !== expectedCurrentStage) {
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
    structure: getStructureForIssueStage({ issue, stage }),
  };
};

const findStoredEvaluation = async ({
  issueId,
  userId,
  stage,
  consensusPhase,
}) => {
  return IssueEvaluation.findOne({
    issue: issueId,
    expert: userId,
    stage,
    consensusPhase,
  });
};

const upsertIssueEvaluation = async ({
  issueId,
  userId,
  stage,
  consensusPhase,
  payload,
  completed,
  submittedAt,
}) => {
  return IssueEvaluation.findOneAndUpdate(
    {
      issue: issueId,
      expert: userId,
      stage,
      consensusPhase,
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

const markParticipationCompleted = async ({ issueId, userId, stage }) => {
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

const advanceToWeightsFinishedAfterSubmit = async ({ issue, stage }) => {
  if (stage !== EVALUATION_STAGES.CRITERIA_WEIGHTING) {
    return;
  }

  const acceptedParticipations = await Participation.find({
    issue: issue._id,
    invitationStatus: "accepted",
  })
    .select("weightsCompleted")
    .lean();

  const allWeightsCompleted = acceptedParticipations.every(
    (participation) => participation.weightsCompleted === true
  );

  if (
    allWeightsCompleted &&
    issue.currentStage === ISSUE_STAGES.CRITERIA_WEIGHTING
  ) {
    issue.currentStage = ISSUE_STAGES.WEIGHTS_FINISHED;
    await issue.save();
  }
};

const loadParticipationsForCompute = async ({ issueId, stage }) => {
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
      return participation.weightsCompleted !== true;
    }

    return participation.evaluationCompleted !== true;
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
            toIdString(participation.expert)
          ),
        },
      }
    );
  }

  return participations;
};

const loadEvaluationsForCompute = async ({
  issueId,
  stage,
  consensusPhase,
  participations,
}) => {
  const evaluations = await IssueEvaluation.find({
    issue: issueId,
    stage,
    consensusPhase,
    completed: true,
  }).populate("expert", "name email");

  const expectedExperts = new Set(
    participations.map((participation) => toIdString(participation.expert))
  );

  const completedExperts = new Set(
    evaluations.map((evaluation) =>
      toIdString(evaluation.expert._id || evaluation.expert)
    )
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

const resetAlternativeRoundCompletion = async (issueId) => {
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

const saveStageResult = async ({ issue, stage, computeResult }) => {
  await IssueStageResult.findOneAndUpdate(
    {
      issue: issue._id,
      stage,
      consensusPhase: issue.consensusPhase,
    },
    {
      $set: {
        consensusMeasure: computeResult.consensusMeasure,
        collectivePayload: computeResult.collectivePayload,
        computedPayload: computeResult.computedPayload,
        modelExecution: computeResult.modelExecution,
        rawOutput: computeResult.rawOutput,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};

const applyComputeIssueUpdates = async ({ issue, computeResult }) => {
  const issueUpdateEntries = Object.entries(computeResult.issueUpdates);

  for (const [key, value] of issueUpdateEntries) {
    issue[key] = value;
  }

  if (computeResult.nextCurrentStage !== null) {
    issue.currentStage = computeResult.nextCurrentStage;
  }

  if (
    issueUpdateEntries.length > 0 ||
    computeResult.nextCurrentStage !== null
  ) {
    await issue.save();
  }
};

export const getIssueEvaluationPayload = async ({ issueId, userId, stage }) => {
  const { issue, structure } = await loadEvaluationContext({
    issueId,
    userId,
    stage,
  });

  const storedEvaluation = await findStoredEvaluation({
    issueId: issue._id,
    userId,
    stage,
    consensusPhase: issue.consensusPhase,
  });

  const payload = await structure.get({
    storedEvaluation,
    issueId: issue._id,
    userId,
    issue,
    phase: issue.consensusPhase,
  });

  return {
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
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
  const { issue, structure } = await loadEvaluationContext({
    issueId,
    userId,
    stage,
  });

  const normalizedPayload = await structure.send({
    payload,
    issueId: issue._id,
    userId,
    issue,
    phase: issue.consensusPhase,
  });

  await upsertIssueEvaluation({
    issueId: issue._id,
    userId,
    stage,
    consensusPhase: issue.consensusPhase,
    payload: normalizedPayload,
    completed: false,
    submittedAt: null,
  });

  return {
    message: "Evaluation draft saved successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
    completed: false,
  };
};

export const submitIssueEvaluation = async ({
  issueId,
  userId,
  stage,
  payload,
}) => {
  const { issue, structure } = await loadEvaluationContext({
    issueId,
    userId,
    stage,
  });

  const normalizedPayload = await structure.submit({
    payload,
    issueId: issue._id,
    userId,
    issue,
    phase: issue.consensusPhase,
  });

  await upsertIssueEvaluation({
    issueId: issue._id,
    userId,
    stage,
    consensusPhase: issue.consensusPhase,
    payload: normalizedPayload,
    completed: true,
    submittedAt: new Date(),
  });

  await markParticipationCompleted({
    issueId: issue._id,
    userId,
    stage,
  });

  await advanceToWeightsFinishedAfterSubmit({ issue, stage });

  return {
    message: "Evaluation submitted successfully",
    stage,
    structureKey: structure.key,
    consensusPhase: issue.consensusPhase,
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
  const { issue, structure } = await loadComputeContext({
    issueId,
    userId,
    stage,
  });

  const participations = await loadParticipationsForCompute({
    issueId: issue._id,
    stage,
  });

  const evaluations = await loadEvaluationsForCompute({
    issueId: issue._id,
    stage,
    consensusPhase: issue.consensusPhase,
    participations,
  });

  const computeResult = await structure.compute({
    issue,
    issueId: issue._id,
    userId,
    stage,
    phase: issue.consensusPhase,
    evaluations,
    participations,
    apiModelsBaseUrl,
    httpClient,
  });

  const {
    computeResult: lifecycleComputeResult,
    resetAlternativeEvaluationCompletion,
  } = resolveEvaluationComputeLifecycle({
    issue,
    stage,
    computeResult,
  });

  await saveStageResult({
    issue,
    stage,
    computeResult: lifecycleComputeResult,
  });

  await applyComputeIssueUpdates({
    issue,
    computeResult: lifecycleComputeResult,
  });

  if (resetAlternativeEvaluationCompletion) {
    await resetAlternativeRoundCompletion(issue._id);
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