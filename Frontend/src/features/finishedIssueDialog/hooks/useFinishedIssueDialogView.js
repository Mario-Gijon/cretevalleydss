import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createIssueScenario, getFinishedIssueInfo, removeIssueScenario } from "../../../services/issue.service";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import { useFinishedIssueRatingsView } from "./useFinishedIssueRatingsView.js";
import { buildParamsResolved, cleanParamsForSend, modelUsesScenarioCriteriaWeights, validateParams, validateScenarioCriteriaWeights } from "../logic/buildFinishedScenarioParameters.js";
import { getCompatReason, isModelCompatible } from "../logic/buildFinishedScenarioRuns.js";
import { buildFinishedIssueExecutionOptions, selectFinishedIssueExecution, selectAlternativePhaseResults } from "../logic/selectFinishedIssueExecution.js";
import { FINISHED_ISSUE_TABS, FINISHED_ISSUE_VIEWS } from "../shared/logic/finishedIssueNavigation";
import { RESULTS_ANALYSIS_VIEWS } from "../sections/resultsAnalysis/logic/resultsAnalysisNavigation";
import { buildModelsData } from "../models/logic/buildModelsData.js";

const unwrap = (response) => response && typeof response === "object" && "data" in response ? response.data : response;
const getIssueId = (issue) => issue?.id || issue?._id || null;
const asArray = (value) => Array.isArray(value) ? value : [];
const pretty = (value) => {
  try { return value === null || value === undefined ? "" : JSON.stringify(value, null, 2); } catch { return String(value); }
};

export const useFinishedIssueDialogView = ({ selectedIssue, openFinishedIssueDialog }) => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const issueId = getIssueId(selectedIssue);
  const requestToken = useRef(0);
  const scatterPlotRef = useRef(null);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedExecutionKey, setSelectedExecutionKey] = useState("base");
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [activeView, setActiveView] = useState(FINISHED_ISSUE_VIEWS.DASHBOARD);
  const [activeResultsAnalysisView, setActiveResultsAnalysisView] = useState(RESULTS_ANALYSIS_VIEWS.OUTCOME);
  const [openDescriptionList, setOpenDescriptionList] = useState(true);
  const [openCriteriaList, setOpenCriteriaList] = useState(true);
  const [openAlternativeList, setOpenAlternativesList] = useState(true);
  const [openConsensusInfoList, setOpenConsensusInfoList] = useState(false);
  const [openExpertsList, setOpenExpertsList] = useState(true);
  const [openParamsViewer, setOpenParamsViewer] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [scenarioParamValues, setScenarioParamValues] = useState({});
  const [scenarioWeightsError, setScenarioWeightsError] = useState("");

  const loadPayload = useCallback(async (id, { preserveExecution = false } = {}) => {
    if (!id) return null;
    const token = ++requestToken.current;
    setLoading(true); setError(null);
    try {
      const response = unwrap(await getFinishedIssueInfo(id));
      const nextPayload = response?.payload || response?.issueInfo || response || null;
      if (token !== requestToken.current) return null;
      setPayload(nextPayload);
      const phase = selectAlternativePhaseResults(nextPayload).at(-1)?.phase ?? null;
      setSelectedPhase(phase);
      setSelectedExecutionKey((current) =>
        preserveExecution && asArray(nextPayload?.scenarios).some((scenario) => scenario?.id === current)
          ? current
          : "base"
      );
      return nextPayload;
    } catch (caught) {
      if (token === requestToken.current) { setPayload(null); setError(caught); setSelectedExecutionKey("base"); setSelectedPhase(null); }
      return null;
    } finally {
      if (token === requestToken.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!openFinishedIssueDialog || !issueId) {
      requestToken.current += 1;
      setPayload(null); setError(null); setSelectedExecutionKey("base"); setSelectedPhase(null);
      return undefined;
    }
    loadPayload(issueId);
    setActiveView(FINISHED_ISSUE_VIEWS.DASHBOARD);
    setActiveResultsAnalysisView(RESULTS_ANALYSIS_VIEWS.OUTCOME);
    return () => { requestToken.current += 1; };
  }, [issueId, openFinishedIssueDialog, loadPayload]);

  const selectedExecution = useMemo(
    () => selectFinishedIssueExecution(payload, selectedExecutionKey),
    [payload, selectedExecutionKey]
  );
  const executionOptions = useMemo(() => buildFinishedIssueExecutionOptions(payload), [payload]);
  const basePhases = useMemo(() => selectAlternativePhaseResults(payload).map((result) => result.phase), [payload]);
  const ratingsSection = useFinishedIssueRatingsView({ payload });

  useEffect(() => {
    if (selectedExecution.type === "base" && !basePhases.includes(selectedPhase)) setSelectedPhase(basePhases.at(-1) ?? null);
  }, [selectedExecution.type, basePhases, selectedPhase]);

  const handleSelectRun = (key) => {
    const execution = selectFinishedIssueExecution(payload, key);
    setSelectedExecutionKey(execution.key);
    if (execution.type === "base") setSelectedPhase(basePhases.at(-1) ?? null);
  };
  const handleChangePhase = (phase) => {
    const next = Number(phase);
    if (selectedExecution.type === "base" && basePhases.includes(next)) setSelectedPhase(next);
  };
  const hasConsensus = payload?.consensus?.enabled === true;
  useEffect(() => {
    if (activeView === FINISHED_ISSUE_VIEWS.CONSENSUS && !hasConsensus) setActiveView(FINISHED_ISSUE_VIEWS.DASHBOARD);
  }, [activeView, hasConsensus]);

  const availableModels = asArray(payload?.models?.compatible);
  const leafCriteria = asArray(payload?.criteria?.nodes).filter((criterion) => criterion?.isLeaf).map((criterion) => ({ id: criterion.id, name: criterion.name }));
  const criteriaTree = asArray(ratingsSection.selectedSerializedContext?.criteriaTree);
  const selectedModel = availableModels.find((model) => model?.id === selectedModelId) || null;
  const selectedModelCompatible = selectedModel ? isModelCompatible(selectedModel) : false;
  useEffect(() => {
    if (!addOpen || !selectedModel) return;
    setScenarioParamValues(buildParamsResolved({ model: selectedModel, leafCount: leafCriteria.length, leafCriteria, baseIssueWeights: payload?.criteria?.finalWeights?.byCriterionId || {} }));
    setScenarioWeightsError("");
  }, [addOpen, selectedModel, leafCriteria, payload?.criteria?.finalWeights?.byCriterionId]);
  const openAddDialog = () => setAddOpen(true);
  const closeAddDialog = () => { setAddOpen(false); setScenarioName(""); setSelectedModelId(""); setScenarioParamValues({}); setScenarioWeightsError(""); };
  const handleAddModelRun = async () => {
    if (!issueId || !selectedModel) { showSnackbarAlert("Please select a compatible model.", "warning"); return; }
    if (!selectedModelCompatible) { showSnackbarAlert(getCompatReason(selectedModel) || "Selected model is not compatible.", "error"); return; }
    let values = scenarioParamValues;
    if (modelUsesScenarioCriteriaWeights(selectedModel)) {
      const checked = validateScenarioCriteriaWeights({ weights: values.weights, leafCriteria, leafCount: leafCriteria.length });
      if (!checked.ok) { setScenarioWeightsError(checked.msg); showSnackbarAlert(checked.msg, "error"); return; }
      values = { ...values, weights: checked.normalized };
    }
    const validation = validateParams({ model: selectedModel, values, leafCount: leafCriteria.length, leafCriteria });
    if (!validation.ok) { showSnackbarAlert(validation.msg || "Invalid parameters.", "error"); return; }
    try {
      setAddLoading(true);
      const response = await createIssueScenario({ issueId, scenarioName: scenarioName.trim() || undefined, targetModelId: selectedModel.id, paramOverrides: cleanParamsForSend({ model: selectedModel, values, leafCount: leafCriteria.length, leafCriteria }) });
      if (!response?.success) { showSnackbarAlert(response?.message || "Could not add model.", "error"); return; }
      const scenarioId = response?.data?.scenarioId || null;
      const refreshed = await loadPayload(issueId, { preserveExecution: false });
      setSelectedExecutionKey(scenarioId && asArray(refreshed?.scenarios).some((scenario) => scenario.id === scenarioId) ? scenarioId : "base");
      closeAddDialog(); showSnackbarAlert("Model run added.", "success");
    } catch (caught) { showSnackbarAlert(caught?.response?.data?.message || "Unexpected error adding model.", "error"); }
    finally { setAddLoading(false); }
  };
  const handleRemoveSelectedRun = async () => {
    if (selectedExecution.type !== "scenario") return;
    try {
      setLoading(true);
      const response = await removeIssueScenario(selectedExecution.key);
      if (!response?.success) { showSnackbarAlert(response?.message || "Could not remove model.", "error"); return; }
      setSelectedExecutionKey("base");
      await loadPayload(issueId, { preserveExecution: false });
      showSnackbarAlert("Model removed.", "success");
    } catch { showSnackbarAlert("Unexpected error removing model.", "error"); }
  };
  const modelsData = buildModelsData({ payload, selectedExecution });
  const selectedParams = modelsData.effectiveParameters || modelsData.configuredParameters || {};

  return {
    selectedIssue,
    dialog: { payload, loading, loadingInfo: loading, error },
    header: {
      selectedExecutionKey, selectedModelNameView: selectedExecution.model?.name || "—", executionOptions,
      selectedRunKey: selectedExecutionKey, selectedRunLabel: selectedExecution.label,
      showRounds: selectedExecution.type === "base" && basePhases.length > 1,
      selectedPhase, basePhases, handleChangePhase, handleSelectRun, openAddDialog,
    },
    navigation: {
      activeView, activeTab: activeView, availableTabs: [FINISHED_ISSUE_TABS.DASHBOARD, FINISHED_ISSUE_TABS.OVERVIEW, FINISHED_ISSUE_TABS.RESULTS_ANALYSIS, FINISHED_ISSUE_TABS.EVALUATIONS, ...(hasConsensus ? [FINISHED_ISSUE_TABS.CONSENSUS] : []), FINISHED_ISSUE_TABS.MODELS],
      setActiveView, handleSelectTab: (tab) => { if (tab === FINISHED_ISSUE_TABS.RESULTS_ANALYSIS) setActiveResultsAnalysisView(RESULTS_ANALYSIS_VIEWS.OUTCOME); setActiveView(tab); }, handleBackToDashboard: () => setActiveView(FINISHED_ISSUE_VIEWS.DASHBOARD),
    },
    resultsAnalysisNavigation: { activeView: activeResultsAnalysisView, setActiveView: setActiveResultsAnalysisView },
    resultsAnalysisSection: { scatterPlotRef, resetZoom: (ref) => ref?.current?.resetZoom?.() },
    overviewSection: { payload, openDescriptionList, setOpenDescriptionList, openCriteriaList, setOpenCriteriaList, openAlternativeList, setOpenAlternativesList, openConsensusInfoList, setOpenConsensusInfoList, openExpertsList, setOpenExpertsList },
    ratingsSection,
    runs: { selectedExecution, selectedExecutionKey, executionOptions, selectedPhase, basePhases },
    modelsSection: {
      ...modelsData, selectedRunKey: selectedExecutionKey, handleRemoveSelectedRun, runsLoading: loading,
      openParamsViewer, setOpenParamsViewer, selectedParams, criteriaTree, leafCriteria,
      selectedRunLabel: selectedExecution.label,
      addDialog: { addOpen, closeAddDialog, addLoading, scenarioName, setScenarioName, selectedModelId, setSelectedModelId, availableModels, selectedModelFromSchema: selectedModel, selectedModelCompatible, scenarioParamValues, setScenarioParamValues, scenarioWeightsError, clearScenarioWeightsError: () => setScenarioWeightsError(""), handleAddModelRun, restoreScenarioDefaults: () => selectedModel && setScenarioParamValues(buildParamsResolved({ model: selectedModel, leafCount: leafCriteria.length, leafCriteria, baseIssueWeights: payload?.criteria?.finalWeights?.byCriterionId || {} })), domainType: null, criteriaTree, leafCriteria },
    },
    modelSpecificOutputSection: { rawOutput: selectedExecution.rawOutput, rawOutputPretty: pretty(selectedExecution.rawOutput), modelExecution: selectedExecution.modelSpecificOutput },
  };
};

export default useFinishedIssueDialogView;
