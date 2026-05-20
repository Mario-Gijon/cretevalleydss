import {
  EVALUATION_STAGES,
  ISSUE_STAGES,
} from "./evaluation.constants.js";
import {
  createBadRequestError,
  createInternalError,
} from "../../../utils/common/errors.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

export const resolveEvaluationComputeLifecycle = ({
  issue,
  stage,
  computeResult,
}) => {
  const safeComputeResult = isPlainObject(computeResult) ? computeResult : {};

  if (stage !== EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    return {
      computeResult: safeComputeResult,
      lifecycleMetadata: null,
      resetAlternativeEvaluationCompletion: false,
    };
  }

  if (issue?.isConsensus !== true) {
    return {
      computeResult: safeComputeResult,
      lifecycleMetadata: null,
      resetAlternativeEvaluationCompletion: false,
    };
  }

  const consensusMeasure = safeComputeResult.consensusMeasure;
  if (!isFiniteNumber(consensusMeasure)) {
    throw createBadRequestError(
      "Consensus computation must return a finite consensusMeasure",
      {
        code: "CONSENSUS_MEASURE_REQUIRED",
        field: "consensusMeasure",
      }
    );
  }

  const threshold = issue?.consensusThreshold;
  if (!isFiniteNumber(threshold)) {
    throw createInternalError("Issue consensusThreshold is invalid", {
      field: "consensusThreshold",
      details: {
        issueId: issue?._id ?? null,
        consensusThreshold: threshold ?? null,
      },
    });
  }

  const maxPhases = issue?.consensusMaxPhases;
  if (!Number.isInteger(maxPhases) || maxPhases < 1) {
    throw createInternalError("Issue consensusMaxPhases is invalid", {
      field: "consensusMaxPhases",
      details: {
        issueId: issue?._id ?? null,
        consensusMaxPhases: maxPhases ?? null,
      },
    });
  }

  const currentConsensusPhase = issue?.consensusPhase;
  if (!Number.isInteger(currentConsensusPhase) || currentConsensusPhase < 1) {
    throw createInternalError("Issue consensusPhase is invalid", {
      field: "consensusPhase",
      details: {
        issueId: issue?._id ?? null,
        consensusPhase: currentConsensusPhase ?? null,
      },
    });
  }

  const consensusReached = consensusMeasure >= threshold;
  const maxPhasesReached = currentConsensusPhase >= maxPhases;
  const shouldFinalize = consensusReached || maxPhasesReached;
  const lifecycleMessage = consensusReached
    ? "Consensus threshold reached. The issue has been finalized."
    : maxPhasesReached
      ? "Maximum consensus rounds reached. The issue has been finalized."
      : "Consensus threshold was not reached. A new consensus round will start.";

  const finalizationReason = consensusReached
    ? "consensusReached"
    : maxPhasesReached
      ? "maxPhasesReached"
      : null;

  const nextConsensusPhase = shouldFinalize
    ? currentConsensusPhase
    : currentConsensusPhase + 1;

  const lifecycleMetadata = {
    isConsensus: true,
    consensusReached,
    maxPhasesReached,
    finalizationReason,
    currentConsensusPhase,
    nextConsensusPhase,
    threshold,
    consensusMeasure,
  };

  const baseIssueUpdates = isPlainObject(safeComputeResult.issueUpdates)
    ? { ...safeComputeResult.issueUpdates }
    : {};
  const issueUpdates = shouldFinalize
    ? {
      ...baseIssueUpdates,
      active: false,
    }
    : {
      ...baseIssueUpdates,
      consensusPhase: nextConsensusPhase,
    };

  return {
    computeResult: {
      ...safeComputeResult,
      message: lifecycleMessage,
      issueUpdates,
      nextCurrentStage: shouldFinalize ? ISSUE_STAGES.FINISHED : null,
      consensusLifecycle: lifecycleMetadata,
    },
    lifecycleMetadata,
    resetAlternativeEvaluationCompletion: !shouldFinalize,
  };
};
