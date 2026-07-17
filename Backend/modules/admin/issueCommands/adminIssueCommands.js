import { computeIssueEvaluationStage } from "../../issues/computation/index.js";
import { deleteIssueCascade } from "../../issues/lifecycle/index.js";
import { editIssueExperts } from "../../issues/participants/index.js";
import { getIssueByIdOrThrow } from "../../issues/queries/index.js";
import { toIdString } from "../../../utils/common/ids.js";
import { runWithTransaction } from "../../../utils/common/mongoose.js";

export const getAdminIssueExecutionContextOrThrow = async ({
  issueId,
  session = null,
}) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: "model",
    lean: false,
    session,
  });

  return {
    issue,
    ownerUserId: toIdString(issue.ownerId),
  };
};

export const editAdminIssueExperts = async (
  { issueId, payload },
  {
    loadExecutionContext = getAdminIssueExecutionContextOrThrow,
    editExperts = editIssueExperts,
    runTransaction = runWithTransaction,
  } = {}
) => {
  const { ownerUserId } = await loadExecutionContext({ issueId });

  const result = await runTransaction((session) =>
    editExperts({
      issueId,
      userId: ownerUserId,
      expertsToAdd: payload.expertsToAdd,
      expertsToRemove: payload.expertsToRemove,
      expertWeightsByEmail: payload.expertWeightsByEmail ?? null,
      hasExpertWeightsByEmail: Object.prototype.hasOwnProperty.call(
        payload,
        "expertWeightsByEmail"
      ),
      session,
    })
  );

  return {
    message: "Experts updated successfully",
    data: {
      issueName: result.issueName,
    },
  };
};

export const computeAdminIssueWeights = async (
  { issueId },
  {
    loadExecutionContext = getAdminIssueExecutionContextOrThrow,
    computeEvaluationStage = computeIssueEvaluationStage,
  } = {}
) => {
  const { ownerUserId } = await loadExecutionContext({ issueId });

  const result = await computeEvaluationStage({
    issueId,
    userId: ownerUserId,
    stage: "criteriaWeighting",
  });

  return {
    message: result.message,
    data: {
      currentStage: result.currentStage,
      consensusPhase: result.consensusPhase,
      weightsByCriterion: result.result?.weightsByCriterion ?? {},
      collectiveEvaluations: result.result?.collectiveEvaluations ?? {},
      consensusMeasure: result.result?.consensusMeasure ?? null,
      consensusLifecycle: result.result?.consensusLifecycle ?? null,
      modelExecution: result.result?.modelExecution ?? null,
      rawOutput: result.result?.rawOutput ?? {},
    },
  };
};

export const resolveAdminIssue = async (
  { issueId },
  {
    loadExecutionContext = getAdminIssueExecutionContextOrThrow,
    computeEvaluationStage = computeIssueEvaluationStage,
  } = {}
) => {
  const { ownerUserId } = await loadExecutionContext({ issueId });

  const result = await computeEvaluationStage({
    issueId,
    userId: ownerUserId,
    stage: "alternativeEvaluation",
  });

  return {
    message: result.message,
    data: {
      finished: result.currentStage === "finished",
      currentStage: result.currentStage,
      consensusPhase: result.consensusPhase,
      rankedAlternatives: result.result?.rankedAlternatives ?? [],
      collectiveEvaluations: result.result?.collectiveEvaluations ?? {},
      plotsGraphic: result.result?.plotsGraphic ?? {},
      consensusMeasure: result.result?.consensusMeasure ?? null,
      consensusLifecycle: result.result?.consensusLifecycle ?? null,
      modelExecution: result.result?.modelExecution ?? null,
      rawOutput: result.result?.rawOutput ?? {},
    },
  };
};

export const removeAdminIssue = async (
  { issueId, beforeSessionCleanup },
  {
    loadExecutionContext = getAdminIssueExecutionContextOrThrow,
    deleteIssue = deleteIssueCascade,
    runTransaction = runWithTransaction,
  } = {}
) => {
  return runTransaction(async (session) => {
    const { issue } = await loadExecutionContext({ issueId, session });

    await deleteIssue({
      issueId: issue._id,
      session,
    });

    return {
      message: `Issue ${issue.name} removed`,
      data: {
        issueName: issue.name,
      },
    };
  }, { onSuccessBeforeCleanup: beforeSessionCleanup });
};
