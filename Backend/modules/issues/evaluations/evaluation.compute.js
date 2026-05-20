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
import { executeAlternativeEvaluationModel } from "../modelExecution/index.js";

const getStructureForIssueStage = ({ issue, stage }) => {
  const structureKeyByStage = {
    [EVALUATION_STAGES.CRITERIA_WEIGHTING]:
      issue.criteriaWeightingStructureKey,
    [EVALUATION_STAGES.ALTERNATIVE_EVALUATION]:
      issue.alternativeEvaluationStructureKey,
  };

  return getEvaluationStructureOrThrow(structureKeyByStage[stage]);
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
        ranking: computeResult.ranking,
        rankedWithScores: computeResult.rankedWithScores,
        scoresByAlternative: computeResult.scoresByAlternative,
        collectiveEvaluations: computeResult.collectiveEvaluations,
        plotsGraphic: computeResult.plotsGraphic,
        consensusLifecycle: computeResult.consensusLifecycle ?? null,
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
  let didSetFinishedAt = false;

  for (const [key, value] of issueUpdateEntries) {
    issue[key] = value;
  }

  if (computeResult.nextCurrentStage !== null) {
    issue.currentStage = computeResult.nextCurrentStage;
  }

  if (
    issue.currentStage === ISSUE_STAGES.FINISHED &&
    issue.active === false &&
    !issue.finishedAt
  ) {
    issue.finishedAt = new Date();
    didSetFinishedAt = true;
  }

  if (
    issueUpdateEntries.length > 0 ||
    computeResult.nextCurrentStage !== null ||
    didSetFinishedAt
  ) {
    await issue.save();
  }
};

const computeCriteriaWeightingStage = async ({
  structure,
  issue,
  issueId,
  userId,
  stage,
  evaluations,
  participations,
  apiModelsBaseUrl,
  httpClient,
}) => {
  if (typeof structure?.compute !== "function") {
    throw createBadRequestError(
      `Evaluation structure '${structure?.key || "unknown"}' does not support compute`,
      {
        field: "structure.compute",
      }
    );
  }

  return structure.compute({
    issue,
    issueId,
    userId,
    stage,
    phase: issue.consensusPhase,
    evaluations,
    participations,
    apiModelsBaseUrl,
    httpClient,
  });
};

const computeAlternativeEvaluationStage = async ({
  structure,
  issue,
  evaluations,
  apiModelsBaseUrl,
  httpClient,
}) => {
  if (typeof structure?.validateCompletedEvaluations === "function") {
    await structure.validateCompletedEvaluations({ evaluations, issue });
  }

  return executeAlternativeEvaluationModel({
    issue,
    structureKey: structure.key,
    evaluations,
    phase: issue.consensusPhase,
    apiModelsBaseUrl,
    httpClient,
    message:
      issue.isConsensus === true
        ? `Consensus round ${issue.consensusPhase} for '${issue.name}' computed successfully.`
        : `Issue '${issue.name}' computed successfully.`,
    issueUpdates:
      issue.isConsensus === true
        ? {}
        : { active: false },
    nextCurrentStage:
      issue.isConsensus === true ? null : ISSUE_STAGES.FINISHED,
  });
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

  const computeResult =
    stage === EVALUATION_STAGES.CRITERIA_WEIGHTING
      ? await computeCriteriaWeightingStage({
        structure,
        issue,
        issueId: issue._id,
        userId,
        stage,
        evaluations,
        participations,
        apiModelsBaseUrl,
        httpClient,
      })
      : await computeAlternativeEvaluationStage({
        structure,
        issue,
        evaluations,
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
      ranking: lifecycleComputeResult.ranking,
      rankedWithScores: lifecycleComputeResult.rankedWithScores,
      scoresByAlternative: lifecycleComputeResult.scoresByAlternative,
      collectiveEvaluations: lifecycleComputeResult.collectiveEvaluations,
      plotsGraphic: lifecycleComputeResult.plotsGraphic,
      consensusMeasure: lifecycleComputeResult.consensusMeasure,
      consensusLifecycle: lifecycleComputeResult.consensusLifecycle ?? null,
      modelExecution: lifecycleComputeResult.modelExecution,
      rawOutput: lifecycleComputeResult.rawOutput,
    },
  };
};
