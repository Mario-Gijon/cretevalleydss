const cloneJsonCompatible = (value, fallback) => {
  if (value === undefined) return fallback;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

const readStageResultId = (scenario) => {
  const candidate =
    scenario?.inputs?.stageResult ??
    scenario?.inputs?.context?.stageResult ??
    scenario?.inputs?.context?.previousStageResult ??
    null;

  if (candidate && typeof candidate === "object" && candidate._id) {
    return candidate._id;
  }

  return candidate;
};

const readConsensusPhase = (scenario) => {
  const phase = scenario?.inputs?.consensusPhaseUsed;
  return Number.isInteger(phase) && phase >= 0 ? phase : 0;
};

const readExecution = (scenario) => {
  const completedAt =
    scenario?.execution?.completedAt ??
    scenario?.updatedAt ??
    scenario?.createdAt ??
    null;

  return {
    startedAt:
      scenario?.execution?.startedAt ?? scenario?.createdAt ?? completedAt,
    completedAt,
  };
};

export const isIssueScenarioMigrated = (scenario) =>
  Boolean(
    scenario?.source &&
      scenario?.config?.parameterOverrides !== undefined &&
      scenario?.requestSnapshot &&
      scenario?.result &&
      scenario?.execution &&
      scenario.execution.status === undefined &&
      scenario.execution.error === undefined
  );

/**
 * Converts the legacy IssueScenario document into the single authoritative
 * persistence contract. This intentionally returns only new fields; callers
 * must unset legacy fields in the same update.
 */
export const buildMigratedIssueScenarioFields = (scenario) => {
  const hasCurrentContract = Boolean(
    scenario?.source &&
      scenario?.config?.parameterOverrides !== undefined &&
      scenario?.requestSnapshot &&
      scenario?.result
  );

  if (hasCurrentContract) {
    return {
      source: scenario.source,
      config: scenario.config,
      requestSnapshot: scenario.requestSnapshot,
      result: scenario.result,
      execution: readExecution(scenario),
    };
  }

  return {
    source: {
      consensusPhase: readConsensusPhase(scenario),
      stageResult: readStageResultId(scenario),
      domainType: scenario?.domainType ?? null,
    },
    config: {
      parameterOverrides: {},
    },
    requestSnapshot: {
      modelParameters: cloneJsonCompatible(
        scenario?.config?.normalizedModelParameters ??
          scenario?.config?.modelParameters,
        {}
      ),
      evaluations: cloneJsonCompatible(scenario?.inputs?.evaluationPayloads, []),
      context: cloneJsonCompatible(scenario?.inputs?.context, {}),
    },
    result: {
      standardResult: cloneJsonCompatible(scenario?.outputs?.standardResult, {}),
      modelExecution: cloneJsonCompatible(scenario?.outputs?.modelExecution, {}),
      rawOutput: cloneJsonCompatible(scenario?.outputs?.rawOutput, {}),
    },
    execution: readExecution(scenario),
  };
};

export const LEGACY_ISSUE_SCENARIO_FIELDS = [
  "targetModelName",
  "targetApiModelKey",
  "targetApiEndpoint",
  "targetEvaluationStructureKey",
  "targetSupportsConsensus",
  "evaluationStructureKey",
  "criteriaWeightsStructureKey",
  "domainType",
  "status",
  "error",
  "inputs",
  "outputs",
];
