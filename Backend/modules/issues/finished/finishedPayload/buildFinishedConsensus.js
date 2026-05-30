import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import { normalizeConsensusPhaseOrThrow } from "./finishedPayloadValidation.js";
import { buildRankedAlternativesPayloadOrThrow } from "./buildFinishedRankings.js";

export const buildModelExecutionPayload = (stageResult) => {
  const modelExecution = isPlainObject(stageResult?.modelExecution)
    ? stageResult.modelExecution
    : {};

  return {
    ...modelExecution,
    rawOutput: stageResult?.rawOutput ?? {},
  };
};

export const buildConsensusRoundPayloadOrThrow = ({ stageResult, threshold }) => {
  const phase = normalizeConsensusPhaseOrThrow({
    value: stageResult?.consensusPhase,
    issueId: stageResult?.issue,
    stage: stageResult?.stage,
  });

  if (
    typeof stageResult?.consensusMeasure !== "number" ||
    !Number.isFinite(stageResult.consensusMeasure)
  ) {
    throw createInternalError("IssueStageResult consensusMeasure must be finite", {
      field: "consensusMeasure",
      details: {
        issueId: toIdString(stageResult?.issue),
        phase,
      },
    });
  }

  const rankedAlternatives = buildRankedAlternativesPayloadOrThrow({ stageResult });
  const collectiveEvaluations = isPlainObject(stageResult?.collectiveEvaluations)
    ? stageResult.collectiveEvaluations
    : null;
  const lifecycle = isPlainObject(stageResult?.modelExecution?.consensusLifecycle)
    ? stageResult.modelExecution.consensusLifecycle
    : {};

  const consensusReached =
    lifecycle?.consensusReached === true ||
    (Number.isFinite(threshold) && stageResult.consensusMeasure >= threshold);
  const maxPhasesReached = lifecycle?.maxPhasesReached === true;
  const finalizationReason = lifecycle?.finalizationReason || null;

  return {
    phase,
    consensusMeasure: stageResult.consensusMeasure,
    threshold,
    consensusReached,
    maxPhasesReached,
    finalizationReason,
    modelExecution: buildModelExecutionPayload(stageResult),
    collectiveEvaluations,
    plotsGraphic: isPlainObject(stageResult?.plotsGraphic)
      ? stageResult.plotsGraphic
      : {},
    rawOutput: stageResult.rawOutput || {},
    rankedAlternatives,
  };
};

export const buildConsensusInfo = ({ issue, consensusRounds }) => {
  const consensusReachedRound = consensusRounds.find(
    (round) => round.finalizationReason === "consensusReached"
  );
  const lastRound = consensusRounds[consensusRounds.length - 1] || null;

  return {
    threshold: issue.consensusThreshold ?? null,
    maxPhases: issue.consensusMaxPhases ?? null,
    currentPhase: issue.consensusPhase ?? null,
    consensusReachedPhase: consensusReachedRound?.phase ?? null,
    finalizationReason: lastRound?.finalizationReason || null,
    finalConsensusMeasure: lastRound?.consensusMeasure ?? null,
  };
};
