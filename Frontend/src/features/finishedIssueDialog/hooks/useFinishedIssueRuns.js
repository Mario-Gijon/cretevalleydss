import { useEffect, useMemo, useState } from "react";

import { createIssueScenario, removeIssueScenario } from "../../../services/issue.service";
import { buildParamsResolved, cleanParamsForSend, modelUsesScenarioCriteriaWeights, validateParams, validateScenarioCriteriaWeights } from "../logic/buildFinishedScenarioParameters.js";
import { getCompatReason, isModelCompatible } from "../logic/buildFinishedScenarioRuns.js";
import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution } from "../logic/selectFinishedIssueExecution.js";

const asArray = (value) => Array.isArray(value) ? value : [];

export const useFinishedIssueRuns = ({ issueId, payload, refreshPayload, showSnackbarAlert }) => {
  const [selectedExecutionKey, setSelectedExecutionKey] = useState("base");
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [scenarioParamValues, setScenarioParamValues] = useState({});
  const [scenarioWeightsError, setScenarioWeightsError] = useState("");
  const selectedExecution = useMemo(
    () => selectFinishedIssueExecution(payload, selectedExecutionKey),
    [payload, selectedExecutionKey]
  );
  const executionOptions = useMemo(() => buildFinishedIssueExecutionOptions(payload), [payload]);
  const availableModels = asArray(payload?.models?.compatible);
  const leafCriteria = asArray(payload?.criteria?.nodes)
    .filter((criterion) => criterion?.isLeaf)
    .map((criterion) => ({ id: criterion.id, name: criterion.name }));
  const selectedModel = availableModels.find((model) => model?.id === selectedModelId) || null;
  const selectedModelCompatible = selectedModel ? isModelCompatible(selectedModel) : false;

  useEffect(() => {
    if (selectedExecutionKey !== "base" && !asArray(payload?.scenarios).some((scenario) => scenario?.id === selectedExecutionKey)) {
      setSelectedExecutionKey("base");
    }
  }, [payload, selectedExecutionKey]);
  useEffect(() => {
    if (!addOpen || !selectedModel) return;
    setScenarioParamValues(buildParamsResolved({
      model: selectedModel,
      leafCount: leafCriteria.length,
      leafCriteria,
      baseIssueWeights: payload?.criteria?.finalWeights?.byCriterionId || {},
    }));
    setScenarioWeightsError("");
  }, [addOpen, leafCriteria, payload?.criteria?.finalWeights?.byCriterionId, selectedModel]);

  const closeAddDialog = () => {
    setAddOpen(false);
    setScenarioName("");
    setSelectedModelId("");
    setScenarioParamValues({});
    setScenarioWeightsError("");
  };
  const restoreScenarioDefaults = () => {
    if (!selectedModel) return;
    setScenarioParamValues(buildParamsResolved({
      model: selectedModel,
      leafCount: leafCriteria.length,
      leafCriteria,
      baseIssueWeights: payload?.criteria?.finalWeights?.byCriterionId || {},
    }));
  };
  const handleAddScenario = async () => {
    if (!issueId || !selectedModel) {
      showSnackbarAlert("Please select a compatible model.", "warning");
      return;
    }
    if (!selectedModelCompatible) {
      showSnackbarAlert(getCompatReason(selectedModel) || "Selected model is not compatible.", "error");
      return;
    }
    let values = scenarioParamValues;
    if (modelUsesScenarioCriteriaWeights(selectedModel)) {
      const checked = validateScenarioCriteriaWeights({ weights: values.weights, leafCriteria, leafCount: leafCriteria.length });
      if (!checked.ok) {
        setScenarioWeightsError(checked.msg);
        showSnackbarAlert(checked.msg, "error");
        return;
      }
      values = { ...values, weights: checked.normalized };
    }
    const validation = validateParams({ model: selectedModel, values, leafCount: leafCriteria.length, leafCriteria });
    if (!validation.ok) {
      showSnackbarAlert(validation.msg || "Invalid parameters.", "error");
      return;
    }
    try {
      setAddLoading(true);
      const response = await createIssueScenario({
        issueId,
        scenarioName: scenarioName.trim() || undefined,
        targetModelId: selectedModel.id,
        paramOverrides: cleanParamsForSend({ model: selectedModel, values, leafCount: leafCriteria.length, leafCriteria }),
      });
      if (!response?.success) {
        showSnackbarAlert(response?.message || "Could not add model.", "error");
        return;
      }
      const scenarioId = response?.data?.scenarioId || null;
      const refreshed = await refreshPayload();
      setSelectedExecutionKey(
        scenarioId && asArray(refreshed?.scenarios).some((scenario) => scenario?.id === scenarioId)
          ? scenarioId
          : "base"
      );
      closeAddDialog();
      showSnackbarAlert("Model run added.", "success");
    } catch (caught) {
      showSnackbarAlert(caught?.response?.data?.message || "Unexpected error adding model.", "error");
    } finally {
      setAddLoading(false);
    }
  };
  const handleRemoveSelectedScenario = async () => {
    if (selectedExecution.type !== "scenario") return;
    try {
      const response = await removeIssueScenario(selectedExecution.key);
      if (!response?.success) {
        showSnackbarAlert(response?.message || "Could not remove model.", "error");
        return;
      }
      setSelectedExecutionKey("base");
      await refreshPayload();
      showSnackbarAlert("Model removed.", "success");
    } catch {
      showSnackbarAlert("Unexpected error removing model.", "error");
    }
  };

  return {
    selectedExecutionKey,
    selectedExecution,
    executionOptions,
    selectExecution: setSelectedExecutionKey,
    addDialog: {
      addOpen,
      addLoading,
      scenarioName,
      selectedModelId,
      availableModels,
      selectedModel,
      selectedModelCompatible,
      scenarioParamValues,
      scenarioWeightsError,
      setScenarioName,
      setSelectedModelId,
      setScenarioParamValues,
      clearScenarioWeightsError: () => setScenarioWeightsError(""),
      open: () => setAddOpen(true),
      close: closeAddDialog,
      restoreScenarioDefaults,
      submit: handleAddScenario,
      leafCriteria,
    },
    removeSelectedScenario: handleRemoveSelectedScenario,
  };
};

export default useFinishedIssueRuns;
