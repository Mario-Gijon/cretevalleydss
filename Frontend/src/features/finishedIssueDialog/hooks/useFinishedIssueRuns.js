import { useEffect, useMemo, useState } from "react";

import { createIssueScenario, removeIssueScenario } from "../../../services/issue.service";
import { buildParamsResolved, cleanParamsForSend, modelUsesScenarioCriteriaWeights, validateParams, validateScenarioCriteriaWeights } from "../logic/buildFinishedScenarioParameters.js";
import { getCompatReason, isModelCompatible } from "../logic/buildFinishedScenarioRuns.js";
import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution } from "../logic/selectFinishedIssueExecution.js";
import { SCENARIO_DESCRIPTION_MAX } from "../logic/scenarioDraft.constants.js";
import { updateScenarioParameterValues } from "../logic/updateScenarioParameterValues.js";

const asArray = (value) => Array.isArray(value) ? value : [];

export const useFinishedIssueRuns = ({ issueId, payload, refreshPayload, showSnackbarAlert }) => {
  const [selectedExecutionKey, setSelectedExecutionKey] = useState("base");
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedSourcePhase, setSelectedSourcePhase] = useState(null);
  const [scenarioParamValues, setScenarioParamValues] = useState({});
  const selectedExecution = useMemo(
    () => selectFinishedIssueExecution(payload, selectedExecutionKey),
    [payload, selectedExecutionKey]
  );
  const executionOptions = useMemo(() => buildFinishedIssueExecutionOptions(payload), [payload]);
  const availableModels = useMemo(() => asArray(payload?.models?.compatible), [payload?.models?.compatible]);
  const leafCriteria = useMemo(() => {
    const domainsById = new Map(asArray(payload?.expressionDomains).map((domain) => [domain?.id, domain]));
    return asArray(payload?.criteria?.nodes).filter((criterion) => criterion?.isLeaf).map((criterion) => ({
      id: criterion.id,
      name: criterion.name,
      type: criterion.type ?? null,
      expressionDomain: criterion.expressionDomainId ? domainsById.get(criterion.expressionDomainId) || null : null,
    }));
  }, [payload?.criteria?.nodes, payload?.expressionDomains]);
  const selectedModel = availableModels.find((model) => model?.id === selectedModelId) || null;
  const selectedModelCompatible = selectedModel ? isModelCompatible(selectedModel) : false;
  const sourcePhases = useMemo(
    () => [...new Set(
      asArray(payload?.phaseResults)
        .filter((result) => result?.stage === "alternativeEvaluation" && Number.isInteger(result?.phase))
        .map((result) => result.phase)
    )].sort((left, right) => left - right),
    [payload?.phaseResults]
  );
  const consensusEnabled = payload?.consensus?.enabled === true;

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
  }, [addOpen, payload?.criteria?.finalWeights?.byCriterionId, selectedModel, leafCriteria]);
  useEffect(() => {
    if (!addOpen) return;
    setSelectedSourcePhase(
      consensusEnabled ? sourcePhases.at(-1) ?? null : null
    );
  }, [addOpen, consensusEnabled, sourcePhases]);

  const closeAddDialog = () => {
    setAddOpen(false);
    setScenarioName("");
    setScenarioDescription("");
    setSelectedModelId("");
    setSelectedSourcePhase(null);
    setScenarioParamValues({});
  };
  const updateScenarioParameter = (key, value) => {
    setScenarioParamValues((current) =>
      updateScenarioParameterValues(current, key, value)
    );
  };
  const handleAddScenario = async () => {
    if (!scenarioName.trim()) {
      showSnackbarAlert("Scenario name is required.", "warning");
      return;
    }
    const trimmedScenarioDescription = scenarioDescription.trim();
    if (!trimmedScenarioDescription) {
      showSnackbarAlert("Scenario description is required.", "warning");
      return;
    }
    if (trimmedScenarioDescription.length > SCENARIO_DESCRIPTION_MAX) {
      showSnackbarAlert(
        `Scenario description must not exceed ${SCENARIO_DESCRIPTION_MAX} characters.`,
        "warning"
      );
      return;
    }
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
        scenarioDescription: trimmedScenarioDescription,
        targetModelId: selectedModel.id,
        ...(consensusEnabled && Number.isInteger(selectedSourcePhase)
          ? { sourcePhase: selectedSourcePhase }
          : {}),
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
  const removeScenario = async (scenarioId) => {
    if (!scenarioId || scenarioId === "base") return;
    try {
      const response = await removeIssueScenario(scenarioId);
      if (!response?.success) {
        showSnackbarAlert(response?.message || "Could not remove model.", "error");
        return;
      }
      if (selectedExecutionKey === scenarioId) setSelectedExecutionKey("base");
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
      scenarioDescription,
      selectedModelId,
      availableModels,
      selectedModel,
      selectedModelCompatible,
      selectedSourcePhase,
      sourcePhases,
      consensusEnabled,
      scenarioParamValues,
      setScenarioName,
      setScenarioDescription,
      setSelectedModelId,
      setSelectedSourcePhase,
      updateScenarioParameter,
      open: () => setAddOpen(true),
      close: closeAddDialog,
      submit: handleAddScenario,
      leafCriteria,
    },
    removeScenario,
  };
};

export default useFinishedIssueRuns;
