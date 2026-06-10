import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import { normalizeConsensusPhaseOrThrow } from "./finishedPayloadValidation.js";
import { buildRankedAlternativesPayloadOrThrow } from "./buildFinishedRankings.js";

export const buildModelExecutionPayload = (stageResult) => {
  if (!isPlainObject(stageResult.modelExecution)) {
    throw createInternalError("IssueStageResult modelExecution must be an object", {
      field: "modelExecution",
      details: {
        issueId: toIdString(stageResult.issue),
        phase: stageResult.consensusPhase,
      },
    });
  }

  if (!isPlainObject(stageResult.rawOutput)) {
    throw createInternalError("IssueStageResult rawOutput must be an object", {
      field: "rawOutput",
      details: {
        issueId: toIdString(stageResult.issue),
        phase: stageResult.consensusPhase,
      },
    });
  }

  return {
    ...stageResult.modelExecution,
    rawOutput: stageResult.rawOutput,
  };
};

export const buildConsensusRoundPayloadOrThrow = ({ stageResult, threshold }) => {
  const phase = normalizeConsensusPhaseOrThrow({
    value: stageResult.consensusPhase,
    issueId: stageResult.issue,
    stage: stageResult.stage,
  });

  if (
    typeof stageResult.consensusMeasure !== "number" ||
    !Number.isFinite(stageResult.consensusMeasure)
  ) {
    throw createInternalError("IssueStageResult consensusMeasure must be finite", {
      field: "consensusMeasure",
      details: {
        issueId: toIdString(stageResult.issue),
        phase,
      },
    });
  }

  const modelExecution = buildModelExecutionPayload(stageResult);
  const rankedAlternatives = buildRankedAlternativesPayloadOrThrow({ stageResult });
  if (!isPlainObject(stageResult.collectiveEvaluations)) {
    throw createInternalError("IssueStageResult collectiveEvaluations must be an object", {
      field: "collectiveEvaluations",
      details: {
        issueId: toIdString(stageResult.issue),
        phase,
      },
    });
  }

  if (!isPlainObject(modelExecution.consensusLifecycle)) {
    throw createInternalError("IssueStageResult modelExecution.consensusLifecycle must be an object", {
      field: "modelExecution.consensusLifecycle",
      details: {
        issueId: toIdString(stageResult.issue),
        phase,
      },
    });
  }

  if (!isPlainObject(stageResult.plotsGraphic)) {
    throw createInternalError("IssueStageResult plotsGraphic must be an object", {
      field: "plotsGraphic",
      details: {
        issueId: toIdString(stageResult.issue),
        phase,
      },
    });
  }

  const collectiveEvaluations = stageResult.collectiveEvaluations;
  const lifecycle = modelExecution.consensusLifecycle;

  const consensusReached =
    lifecycle.consensusReached === true ||
    (Number.isFinite(threshold) && stageResult.consensusMeasure >= threshold);
  const maxPhasesReached = lifecycle.maxPhasesReached === true;
  const finalizationReason = lifecycle.finalizationReason ?? null;

  return {
    phase,
    consensusMeasure: stageResult.consensusMeasure,
    threshold,
    consensusReached,
    maxPhasesReached,
    finalizationReason,
    modelExecution,
    collectiveEvaluations,
    plotsGraphic: stageResult.plotsGraphic,
    rawOutput: stageResult.rawOutput,
    rankedAlternatives,
  };
};

export const buildConsensusInfo = ({ issue, consensusRounds }) => {
  if (!Array.isArray(consensusRounds) || consensusRounds.length === 0) {
    throw createInternalError("Consensus rounds must be a non-empty array", {
      field: "consensusRounds",
      details: {
        issueId: toIdString(issue._id),
      },
    });
  }

  const consensusReachedRound = consensusRounds.find(
    (round) => round.finalizationReason === "consensusReached"
  );
  const lastRound = consensusRounds[consensusRounds.length - 1];

  return {
    threshold: issue.consensusThreshold ?? null,
    maxPhases: issue.consensusMaxPhases ?? null,
    currentPhase: issue.consensusPhase ?? null,
    consensusReachedPhase: consensusReachedRound ? consensusReachedRound.phase : null,
    finalizationReason: lastRound.finalizationReason ?? null,
    finalConsensusMeasure: lastRound.consensusMeasure,
  };
};
