import { buildFinishedIssueExecutionOptions } from "../../../logic/selectFinishedIssueExecution.js";

export const buildModelsData = ({ payload, selectedExecution }) => ({
  baseModel: payload?.models?.base || null,
  criteriaWeightingModel: payload?.models?.criteriaWeighting || null,
  compatibleModels: Array.isArray(payload?.models?.compatible) ? payload.models.compatible : [],
  scenarios: Array.isArray(payload?.scenarios) ? payload.scenarios : [],
  executionOptions: buildFinishedIssueExecutionOptions(payload),
  selectedExecution: selectedExecution || null,
  configuredParameters: selectedExecution?.configuration?.configuredParameters ?? selectedExecution?.model?.configuredParameters ?? null,
  effectiveParameters: selectedExecution?.configuration?.normalizedParameters ?? selectedExecution?.model?.effectiveParameters ?? null,
  status: selectedExecution?.scenario?.status || "completed",
  error: selectedExecution?.scenario?.error ?? null,
  modelSpecificOutput: selectedExecution?.modelSpecificOutput ?? null,
  rawOutput: selectedExecution?.rawOutput ?? null,
  completeness: payload?.executionMetadata?.completeness ?? null,
});

export const buildModelsPreview = (data) => ({
  baseModelName: data.baseModel?.name || "—",
  selectedExecutionKey: data.selectedExecution?.key || "base",
  selectedExecutionLabel: data.selectedExecution?.label || "Base",
  selectedExecutionIsBase: data.selectedExecution?.type !== "scenario",
  additionalRunsCount: data.scenarios.length,
});
