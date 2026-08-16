import { createBadRequestError, createInternalError } from "../../../utils/common/errors.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeExecutionKeyOrThrow = (executionKey) => {
  if (typeof executionKey !== "string" || !executionKey.trim()) {
    throw createBadRequestError("executionKey is required", { field: "executionKey" });
  }
  return executionKey.trim();
};

const scenarioRoundOrThrow = ({ baseRoundsByPhase, phaseResult, scenarioId }) => {
  const sourceRound = baseRoundsByPhase.get(phaseResult.phase);
  if (!sourceRound) {
    throw createInternalError("Scenario analysis phase has no corresponding Issue phase context", {
      field: "analysisContext.rounds",
      details: { scenarioId, phase: phaseResult.phase },
    });
  }
  return {
    ...clone(sourceRound),
    selectedExecution: {
      attemptId: phaseResult.attemptId,
      correlationId: phaseResult.correlationId,
      startedAt: phaseResult.startedAt,
      completedAt: phaseResult.completedAt,
      ...clone(phaseResult.execution),
    },
    executionAttempts: [{
      id: phaseResult.attemptId,
      status: "succeeded",
      failureStage: null,
      startedAt: phaseResult.startedAt,
      completedAt: phaseResult.completedAt,
      applicationStatus: "applied",
    }],
  };
};

export const projectExecutionAnalysisContext = ({ analysisContext, executionKey }) => {
  const key = normalizeExecutionKeyOrThrow(executionKey);
  if (!analysisContext || typeof analysisContext !== "object") {
    throw createInternalError("Analysis context must be an object", { field: "analysisContext" });
  }

  if (key === "base") {
    return {
      execution: { key: "base", type: "base", scenarioId: null },
      analysisContext: clone(analysisContext),
    };
  }

  const scenario = (analysisContext.scenarios?.current || []).find((entry) => entry?.id === key);
  if (!scenario) {
    throw createBadRequestError("Scenario execution is not available for this finished issue", {
      field: "executionKey",
      details: { executionKey: key },
    });
  }
  const phaseResults = Array.isArray(scenario.phaseResults) ? scenario.phaseResults.slice().sort((left, right) => left.phase - right.phase) : [];
  if (!phaseResults.length) {
    throw createInternalError("Scenario analysis requires phase results", {
      field: "analysisContext.scenarios.current.phaseResults",
      details: { scenarioId: scenario.id },
    });
  }
  const baseRoundsByPhase = new Map((analysisContext.rounds || []).map((round) => [round.phase, round]));
  const rounds = phaseResults.map((phaseResult) => scenarioRoundOrThrow({ baseRoundsByPhase, phaseResult, scenarioId: scenario.id }));

  return {
    execution: { key, type: "scenario", scenarioId: scenario.id },
    analysisContext: {
      ...clone(analysisContext),
      rounds,
    },
  };
};

export default projectExecutionAnalysisContext;
