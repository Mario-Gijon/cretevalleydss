import { buildFinishedIssueExecutionOptions } from "../../logic/selectFinishedIssueExecution.js";

export const buildModelsData = ({ payload, selectedExecution }) => ({
  baseModel: payload?.models?.base || null,
  criteriaWeightingModel: payload?.models?.criteriaWeighting || null,
  compatibleModels: Array.isArray(payload?.models?.compatible) ? payload.models.compatible : [],
  scenarios: Array.isArray(payload?.scenarios) ? payload.scenarios : [],
  executionOptions: buildFinishedIssueExecutionOptions(payload),
  selectedExecution: selectedExecution || null,
  configuredParameters: selectedExecution?.configuration?.configuredParameters
    ?? selectedExecution?.model?.configuredParameters
    ?? null,
  effectiveParameters: selectedExecution?.configuration?.normalizedParameters
    ?? selectedExecution?.model?.effectiveParameters
    ?? null,
  normalizedParameters: selectedExecution?.configuration?.normalizedParameters ?? null,
  status: selectedExecution?.scenario?.status || "completed",
  error: selectedExecution?.scenario?.error ?? null,
  modelSpecificOutput: selectedExecution?.modelSpecificOutput ?? null,
  rawOutput: selectedExecution?.rawOutput ?? null,
  sourceInputs: selectedExecution?.scenario?.inputs ?? null,
  completeness: payload?.executionMetadata?.completeness ?? null,
});

export default buildModelsData;
