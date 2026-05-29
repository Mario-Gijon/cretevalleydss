import { createBadRequestError } from "../../../utils/common/errors.js";

const normalizeFiniteNumber = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
};

export const resolveIssueConsensusConfigOrThrow = ({
  requestedIsConsensus,
  supportsConsensus,
  consensusThreshold,
  consensusMaxPhases,
}) => {
  const isConsensus = requestedIsConsensus === true;

  if (!isConsensus) {
    return {
      isConsensus: false,
      consensusThreshold: null,
      consensusMaxPhases: null,
    };
  }

  if (supportsConsensus !== true) {
    throw createBadRequestError(
      "Selected model does not support consensus issues",
      {
        code: "MODEL_DOES_NOT_SUPPORT_CONSENSUS",
        field: "isConsensus",
      }
    );
  }

  const normalizedThreshold = normalizeFiniteNumber(consensusThreshold);
  if (
    normalizedThreshold === null ||
    normalizedThreshold < 0 ||
    normalizedThreshold > 1
  ) {
    throw createBadRequestError(
      "consensusThreshold is required and must be a finite number between 0 and 1",
      {
        code: "INVALID_CONSENSUS_THRESHOLD",
        field: "consensusThreshold",
      }
    );
  }

  if (consensusMaxPhases === null || consensusMaxPhases === undefined) {
    return {
      isConsensus: true,
      consensusThreshold: normalizedThreshold,
      consensusMaxPhases: null,
    };
  }

  if (!Number.isInteger(consensusMaxPhases) || Number(consensusMaxPhases) <= 0) {
    throw createBadRequestError("consensusMaxPhases must be a positive integer", {
      code: "INVALID_CONSENSUS_MAX_PHASES",
      field: "consensusMaxPhases",
    });
  }

  return {
    isConsensus: true,
    consensusThreshold: normalizedThreshold,
    consensusMaxPhases,
  };
};

export const resolveIssueSimulationConfigOrThrow = ({
  simulateConsensus,
  isConsensus,
  supportsConsensus,
  supportsConsensusSimulation,
}) => {
  if (simulateConsensus !== true) {
    return false;
  }

  if (isConsensus !== true) {
    throw createBadRequestError(
      "simulateConsensus can only be enabled for consensus issues",
      {
        code: "SIMULATION_REQUIRES_CONSENSUS_ISSUE",
        field: "simulateConsensus",
      }
    );
  }

  if (supportsConsensus !== true) {
    throw createBadRequestError(
      "simulateConsensus requires a model that supports consensus",
      {
        code: "SIMULATION_REQUIRES_CONSENSUS_MODEL",
        field: "simulateConsensus",
      }
    );
  }

  if (supportsConsensusSimulation !== true) {
    throw createBadRequestError(
      "simulateConsensus requires a model that supports consensus simulation",
      {
        code: "MODEL_DOES_NOT_SUPPORT_CONSENSUS_SIMULATION",
        field: "simulateConsensus",
      }
    );
  }

  return true;
};
