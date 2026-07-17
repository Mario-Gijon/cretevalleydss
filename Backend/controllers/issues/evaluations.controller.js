import { computeIssueEvaluationStage } from "../../modules/issues/computation/index.js";
import {
  getIssueEvaluationPayload,
  saveIssueEvaluationDraft,
  submitIssueEvaluationWorkflow,
} from "../../modules/issues/evaluations/index.js";
import { sendSuccess } from "../../utils/common/responses.js";

export const getIssueEvaluationByStage = async (req, res) => {
  const result = await getIssueEvaluationPayload({
    issueId: req.params.id,
    userId: req.uid,
    stage: req.params.stage,
  });

  return sendSuccess(res, "Evaluation fetched successfully", result);
};

export const saveIssueEvaluationByStage = async (req, res) => {
  const result = await saveIssueEvaluationDraft({
    issueId: req.params.id,
    userId: req.uid,
    stage: req.params.stage,
    payload: req.body.payload,
  });

  return sendSuccess(res, result.message, {
    stage: result.stage,
    structureKey: result.structureKey,
    consensusPhase: result.consensusPhase,
    completed: result.completed,
  });
};

export const submitIssueEvaluationByStage = async (req, res) => {
  return submitIssueEvaluationWorkflow({
    issueId: req.params.id,
    userId: req.uid,
    stage: req.params.stage,
    payload: req.body.payload,
    beforeSessionCleanup: (result) =>
      sendSuccess(res, result.message, {
        stage: result.stage,
        structureKey: result.structureKey,
        consensusPhase: result.consensusPhase,
        completed: result.completed,
        currentStage: result.currentStage,
      }),
  });
};

export const computeEvaluationStage = async (req, res) => {
  const result = await computeIssueEvaluationStage({
    issueId: req.params.id,
    userId: req.uid,
    stage: req.params.stage,
  });

  return sendSuccess(res, result.message, {
    stage: result.stage,
    structureKey: result.structureKey,
    consensusPhase: result.consensusPhase,
    currentStage: result.currentStage,
    result: result.result,
  });
};
