const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasModelSpecificOutput = (value) => {
  if (value === null || value === undefined) return false;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
};

const formatExecutedAt = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
};

const firstDefinedValue = (values = []) => {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return null;
};

const resolveModelSpecificOutput = ({ viewIssue, currentPhaseIndex }) => {
  const selectedPhase = Number(currentPhaseIndex);
  const findByPhase = (entries = []) =>
    entries.find((entry) => Number(entry?.phase) === selectedPhase) || null;

  const selectedRound =
    findByPhase(Array.isArray(viewIssue?.consensusHistory) ? viewIssue.consensusHistory : []) ||
    findByPhase(Array.isArray(viewIssue?.consensusRounds) ? viewIssue.consensusRounds : []) ||
    findByPhase(Array.isArray(viewIssue?.consensus) ? viewIssue.consensus : []);

  const selectedRoundModelExecution =
    selectedRound?.modelExecution || selectedRound?.details?.modelExecution || null;

  const modelExecution = firstDefinedValue([
    selectedRoundModelExecution,
    viewIssue?.modelExecution,
    viewIssue?.consensusDetails?.modelExecution,
    viewIssue?.selectedScenario?.outputs?.modelExecution,
  ]);

  const rawOutput = firstDefinedValue([
    selectedRoundModelExecution?.rawOutput,
    viewIssue?.modelExecution?.rawOutput,
    viewIssue?.consensusDetails?.modelExecution?.rawOutput,
    viewIssue?.selectedScenario?.outputs?.rawOutput,
    viewIssue?.selectedScenario?.outputs?.standardResult?.rawOutput,
    modelExecution?.rawOutput,
  ]);

  return {
    rawOutput,
    modelExecution:
      modelExecution ||
      (rawOutput !== null && rawOutput !== undefined ? { rawOutput } : null),
  };
};

export const buildFinishedModelOutputView = ({
  viewIssue,
  currentPhaseIndex,
}) => {
  const { rawOutput, modelExecution } = resolveModelSpecificOutput({
    viewIssue,
    currentPhaseIndex,
  });
  const rawOutputExists = hasModelSpecificOutput(rawOutput);

  return {
    rawOutput,
    rawOutputExists,
    modelExecution: modelExecution
      ? {
          modelName: modelExecution?.modelName ?? null,
          modelKey: modelExecution?.modelKey ?? null,
          executedAt: formatExecutedAt(modelExecution?.executedAt ?? null),
        }
      : null,
  };
};
