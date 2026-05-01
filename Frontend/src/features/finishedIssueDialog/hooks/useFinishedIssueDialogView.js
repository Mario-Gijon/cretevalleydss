import { useEffect, useMemo, useRef, useState } from "react";

import {
  createIssueScenario,
  getFinishedIssueInfo,
  getIssueResultsAnalysis,
  getScenarioResultsAnalysis,
  getIssueScenarioById,
  getIssueScenarios,
  getModelsInfo,
  regenerateIssueResultsAnalysis,
  regenerateScenarioResultsAnalysis,
  removeIssueScenario,
} from "../../../services/issue.service";
import { resolveIssueAlternativeEvaluationStructure } from "../../issueAlternativeEvaluation/utils/evaluationStructure";
import { getFinishedIssueRatingsUi } from "../utils/finishedIssueRatings.ui";
import {
  applyScenarioToIssueInfo,
  buildParamsResolved,
  buildPseudoParametersFromValues,
  cleanParamsForSend,
  filterOutWeightsParams,
  getCompatReason,
  getLastPhaseIndex,
  getLeafCriteriaNamesFallback,
  getRoundsCount,
  hasSingleLeafCriterion,
  isModelCompatible,
  safeJsonStringify,
  validateParams,
} from "../utils/finishedIssueDialog.utils";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";

const unwrap = (response) =>
  response && typeof response === "object" && "data" in response
    ? response.data
    : response;

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
  const selectedPhase = Number(currentPhaseIndex) + 1;
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
    viewIssue?.selectedScenario?.outputs?.details?.modelExecution,
  ]);

  const rawOutput = firstDefinedValue([
    selectedRoundModelExecution?.rawOutput,
    viewIssue?.modelExecution?.rawOutput,
    viewIssue?.consensusDetails?.modelExecution?.rawOutput,
    viewIssue?.selectedScenario?.outputs?.rawResults,
    viewIssue?.selectedScenario?.outputs?.details?.modelExecution?.rawOutput,
    modelExecution?.rawOutput,
  ]);

  return {
    rawOutput,
    modelExecution:
      modelExecution ||
      (rawOutput !== null && rawOutput !== undefined ? { rawOutput } : null),
  };
};

/**
 * Hook principal del dialogo de detalle de finished issue.
 *
 * Centraliza estado, derivaciones y acciones del flujo del dialogo
 * para mantener el componente de UI enfocado en composicion.
 *
 * @param {Object} params Parametros del hook.
 * @returns {Object}
 */
export const useFinishedIssueDialogView = ({
  selectedIssue,
  openFinishedIssueDialog,
}) => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const scatterPlotRef = useRef(null);
  const consensusLevelChartRef = useRef(null);
  const resetZoom = (chartRef) => chartRef?.current?.resetZoom?.();

  const openTokenRef = useRef(0);
  const baseIssueRef = useRef(null);

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);

  const [openDescriptionList, setOpenDescriptionList] = useState(false);
  const [openCriteriaList, setOpenCriteriaList] = useState(false);
  const [openAlternativeList, setOpenAlternativesList] = useState(false);
  const [openConsensusInfoList, setOpenConsensusInfoList] = useState(false);
  const [openExpertsList, setOpenExpertsList] = useState(false);
  const [openParamsViewer, setOpenParamsViewer] = useState(false);

  const [loadingInfo, setLoadingInfo] = useState(false);
  const [issue, setIssue] = useState({});

  const [activeStep, setActiveStep] = useState(0);
  const handleNext = () => setActiveStep((prev) => Math.min(1, prev + 1));
  const handleBack = () => setActiveStep((prev) => Math.max(0, prev - 1));

  const [showCollective, setShowCollective] = useState(false);

  const [runsLoading, setRunsLoading] = useState(false);
  const [runs, setRuns] = useState([]);
  const [selectedRunKey, setSelectedRunKey] = useState("base");
  const [runCache, setRunCache] = useState({});

  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  const [selectedModelId, setSelectedModelId] = useState("");
  const [scenarioParamValues, setScenarioParamValues] = useState({});

  const [modelsCatalog, setModelsCatalog] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [paramsJson, setParamsJson] = useState("{}");

  const [toast, setToast] = useState({
    open: false,
    severity: "success",
    msg: "",
  });
  const [savedAnalysis, setSavedAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const [selectedExpert, setSelectedExpert] = useState("");
  const [selectedCriterion, setSelectedCriterion] = useState("");

  useEffect(() => {
    baseIssueRef.current = issue;
  }, [issue]);

  const refreshRuns = async (issueId) => {
    if (!issueId) return [];

    const data = unwrap(await getIssueScenarios(issueId));
    const list = Array.isArray(data) ? data : data?.scenarios || [];
    const normalized = Array.isArray(list) ? list : [];

    setRuns(normalized);
    return normalized;
  };

  useEffect(() => {
    const issueId = selectedIssue?.id;
    if (!issueId || !openFinishedIssueDialog) return;

    let cancelled = false;
    const token = ++openTokenRef.current;

    const run = async () => {
      setLoadingInfo(true);
      setRunsLoading(true);
      setSavedAnalysis(null);
      setAnalysisError("");

      try {
        const [baseResp, runsResp] = await Promise.all([
          getFinishedIssueInfo(issueId),
          getIssueScenarios(issueId),
        ]);

        if (cancelled || openTokenRef.current !== token) return;

        const baseData = unwrap(baseResp);
        const loadedIssue = baseData?.issueInfo || baseData || {};

        setIssue(loadedIssue || {});
        setSelectedRunKey("base");
        setRunCache({});
        setRuns([]);

        const runsData = unwrap(runsResp);
        const list = Array.isArray(runsData) ? runsData : runsData?.scenarios || [];
        setRuns(Array.isArray(list) ? list : []);

        const index = getLastPhaseIndex(loadedIssue || {});
        setCurrentPhaseIndex(index);

        setActiveStep(0);
        setShowCollective(false);
        setOpenDescriptionList(false);
        setOpenCriteriaList(false);
        setOpenAlternativesList(false);
        setOpenConsensusInfoList(false);
        setOpenExpertsList(false);
        setOpenParamsViewer(false);

        setSelectedModelId("");
        setScenarioParamValues({});
        setScenarioName("");
        setParamsJson("{}");

      } catch {
        if (cancelled || openTokenRef.current !== token) return;
        setIssue({});
        setRuns([]);
        setSelectedRunKey("base");
        setRunCache({});
        setCurrentPhaseIndex(0);
        setSavedAnalysis(null);
      } finally {
        // eslint-disable-next-line no-unsafe-finally
        if (cancelled || openTokenRef.current !== token) return;
        setLoadingInfo(false);
        setRunsLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [selectedIssue?.id, openFinishedIssueDialog]);

  useEffect(() => {
    const issueId = selectedIssue?.id;
    if (!issueId || !openFinishedIssueDialog) return;

    let cancelled = false;
    const activeRun = selectedRunKey;
    const scenarioId = activeRun !== "base" ? activeRun : null;

    const loadAnalysis = async () => {
      setLoadingAnalysis(true);
      setSavedAnalysis(null);
      setAnalysisError("");

      try {
        const response = scenarioId
          ? await getScenarioResultsAnalysis(issueId, scenarioId)
          : await getIssueResultsAnalysis(issueId);

        if (cancelled) return;
        setSavedAnalysis(unwrap(response) || null);
      } catch (error) {
        if (cancelled) return;
        const message = scenarioId
          ? "Could not load scenario results analysis."
          : "Could not load results analysis.";
        setSavedAnalysis(null);
        setAnalysisError(error?.response?.data?.message || message);
      } finally {
        // eslint-disable-next-line no-unsafe-finally
        if (cancelled) return;
        setLoadingAnalysis(false);
      }
    };

    loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [selectedIssue?.id, selectedRunKey, openFinishedIssueDialog]);

  const handleGenerateOrRegenerateAnalysis = async () => {
    if (!selectedIssue?.id) return;

    try {
      setGeneratingAnalysis(true);
      setAnalysisError("");
      const scenarioId = selectedRunKey !== "base" ? selectedRunKey : null;

      const response = scenarioId
        ? await regenerateScenarioResultsAnalysis(selectedIssue.id, scenarioId)
        : await regenerateIssueResultsAnalysis(selectedIssue.id);
      const generated = unwrap(response);

      setSavedAnalysis(generated || null);
      showSnackbarAlert(
        scenarioId
          ? "Scenario results analysis generated successfully."
          : "Results analysis generated successfully.",
        "success"
      );
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        (selectedRunKey !== "base"
          ? "Could not generate scenario results analysis."
          : "Could not generate results analysis.");
      setAnalysisError(msg);
      showSnackbarAlert(msg, "error");
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  const ensureRunLoaded = async (runKey) => {
    if (!runKey || runKey === "base") return null;

    const cached = runCache[runKey];
    if (cached) return cached;

    try {
      setRunsLoading(true);
      const response = unwrap(await getIssueScenarioById(runKey));
      const scenario = response?.scenario || response || null;

      if (!scenario?.outputs?.details) {
        setToast({
          open: true,
          severity: "warning",
          msg: "Scenario results not available yet.",
        });
        return null;
      }

      const info = applyScenarioToIssueInfo(baseIssueRef.current || issue, scenario);
      setRunCache((prev) => ({ ...prev, [runKey]: info }));
      return info;
    } catch {
      setToast({
        open: true,
        severity: "error",
        msg: "Could not load scenario.",
      });
      return null;
    } finally {
      setRunsLoading(false);
    }
  };

  const handleSelectRun = async (runKey) => {
    setSelectedRunKey(runKey);
    setActiveStep(0);
    setShowCollective(false);

    if (runKey === "base") {
      setCurrentPhaseIndex(getLastPhaseIndex(issue || {}));
      return;
    }

    await ensureRunLoaded(runKey);
    setCurrentPhaseIndex(0);
  };

  useEffect(() => {
    if (!openFinishedIssueDialog) return;

    if (selectedRunKey === "base") {
      setCurrentPhaseIndex(getLastPhaseIndex(issue || {}));
      return;
    }

    const info = runCache[selectedRunKey];
    if (info) setCurrentPhaseIndex(0);
  }, [selectedRunKey, issue, runCache, openFinishedIssueDialog]);

  const viewIssue =
    selectedRunKey === "base" ? issue : runCache[selectedRunKey] || null;
  const isScenarioSelected = selectedRunKey !== "base";
  const selectedPhase = currentPhaseIndex + 1;

  const baseModelParamsBlock = issue?.modelParams || null;
  const availableModelsRaw = baseModelParamsBlock?.availableModels;
  const baseIssueWeights = useMemo(() => {
    const weightsFromSaved = issue?.modelParams?.base?.paramsSaved?.weights;
    if (Array.isArray(weightsFromSaved)) return weightsFromSaved;
    const weightsFromResolved = issue?.modelParams?.base?.paramsResolved?.weights;
    if (Array.isArray(weightsFromResolved)) return weightsFromResolved;
    return [];
  }, [issue]);

  const availableModels = useMemo(
    () =>
      (Array.isArray(availableModelsRaw) ? availableModelsRaw : []).map((model) => ({
        ...model,
        baseIssueWeights,
      })),
    [availableModelsRaw, baseIssueWeights]
  );

  const domainType = baseModelParamsBlock?.domainType || null;

  const leafNames = useMemo(() => {
    const fromBackend = baseModelParamsBlock?.leafCriteria
      ?.map((criterion) => criterion?.name)
      .filter(Boolean);

    if (fromBackend?.length) return fromBackend;
    return getLeafCriteriaNamesFallback(issue?.summary?.criteria || []);
  }, [baseModelParamsBlock, issue?.summary?.criteria]);

  const evaluationStructure = useMemo(
    () => resolveIssueAlternativeEvaluationStructure(viewIssue || issue),
    [viewIssue, issue]
  );

  const ratingsUi = useMemo(
    () => getFinishedIssueRatingsUi(evaluationStructure),
    [evaluationStructure]
  );

  const hasSingleCriterion = useMemo(
    () => hasSingleLeafCriterion(viewIssue || issue),
    [viewIssue, issue]
  );

  const roundsCount = getRoundsCount(viewIssue || {});
  const showRounds = Boolean(viewIssue?.summary?.consensusInfo && roundsCount > 1);

  useEffect(() => {
    const experts = ratingsUi.getExpertList({
      viewIssue,
      currentPhaseIndex,
    });

    const newExpert = experts[0] || "";
    setSelectedExpert(newExpert);

    const criteria = ratingsUi.getCriterionList({
      viewIssue,
      currentPhaseIndex,
      selectedExpert: newExpert,
    });

    setSelectedCriterion(criteria[0] || "");
  }, [viewIssue, currentPhaseIndex, ratingsUi]);

  const expertList = useMemo(
    () =>
      ratingsUi.getExpertList({
        viewIssue,
        currentPhaseIndex,
      }),
    [viewIssue, currentPhaseIndex, ratingsUi]
  );

  const criterionList = useMemo(
    () =>
      ratingsUi.getCriterionList({
        viewIssue,
        currentPhaseIndex,
        selectedExpert,
      }),
    [viewIssue, currentPhaseIndex, selectedExpert, ratingsUi]
  );

  const showCriterionSelector = useMemo(
    () =>
      ratingsUi.showCriterionSelector({
        hasSingleCriterion,
        criterionList,
        viewIssue,
        currentPhaseIndex,
        selectedExpert,
      }),
    [
      hasSingleCriterion,
      criterionList,
      viewIssue,
      currentPhaseIndex,
      selectedExpert,
      ratingsUi,
    ]
  );

  const evaluations = useMemo(
    () =>
      ratingsUi.getEvaluations({
        viewIssue,
        currentPhaseIndex,
        selectedExpert,
        selectedCriterion,
      }),
    [viewIssue, currentPhaseIndex, selectedExpert, selectedCriterion, ratingsUi]
  );

  const collectiveEvaluations = useMemo(
    () =>
      ratingsUi.getCollectiveEvaluations({
        viewIssue,
        currentPhaseIndex,
        selectedExpert,
        selectedCriterion,
        showCollective,
      }),
    [
      viewIssue,
      currentPhaseIndex,
      selectedExpert,
      selectedCriterion,
      showCollective,
      ratingsUi,
    ]
  );

  const ranking =
    (Array.isArray(viewIssue?.alternativesRankings)
      ? viewIssue.alternativesRankings.find(
          (entry) => Number(entry?.phase) === Number(selectedPhase)
        )
      : null)?.ranking ?? [];
  const lastIndex = ranking.length - 1;

  const formatScore = (number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(number);

  const handleChangePhase = (index) => {
    setCurrentPhaseIndex(index);
    setActiveStep(0);
    setShowCollective(false);
  };

  const participated = viewIssue?.summary?.experts?.participated || [];
  const notAccepted = viewIssue?.summary?.experts?.notAccepted || [];
  const totalExperts = participated.length + notAccepted.length;

  const getRunId = (run) => run?._id || run?.id || run?.scenarioId || run?.runId;
  const getRunLabel = (run) => {
    const customName = run?.name || run?.scenarioName;
    if (customName) return customName;

    const modelName = run?.targetModelName || run?.modelName || "Model run";
    const versionLabel =
      typeof run?.targetVersionLabel === "string"
        ? run.targetVersionLabel.trim()
        : "";

    return versionLabel ? `${modelName} · ${versionLabel}` : modelName;
  };

  const useSchemaAdd = Boolean(Array.isArray(availableModels) && availableModels.length);

  const selectedModelFromSchema = useMemo(() => {
    if (!useSchemaAdd) return null;
    return availableModels.find((model) => model?.id === selectedModelId) || null;
  }, [useSchemaAdd, availableModels, selectedModelId]);

  const openAddDialog = async () => {
    setAddOpen(true);

    if (useSchemaAdd) {
      setModelsCatalog([]);
      return;
    }

    if (modelsCatalog?.length) return;

    try {
      setModelsLoading(true);
      const response = unwrap(await getModelsInfo());
      const models = response?.models || response || [];
      setModelsCatalog(Array.isArray(models) ? models : []);
    } catch {
      setModelsCatalog([]);
    } finally {
      setModelsLoading(false);
    }
  };

  const closeAddDialog = () => {
    setAddOpen(false);
    setScenarioName("");
    setSelectedModelId("");
    setScenarioParamValues({});
    setParamsJson("{}");
  };

  useEffect(() => {
    if (!addOpen) return;
    if (!useSchemaAdd) return;
    if (!selectedModelFromSchema) return;

    const defaults = buildParamsResolved({
      model: selectedModelFromSchema,
      leafCount: leafNames.length,
    });

    setScenarioParamValues(defaults);
  }, [addOpen, useSchemaAdd, selectedModelFromSchema, leafNames]);

  const handleAddModelRun = async () => {
    if (!selectedIssue?.id) return;

    if (!selectedModelId) {
      setToast({
        open: true,
        severity: "warning",
        msg: "Please select a model.",
      });
      return;
    }

    let modelParameters = {};

    if (useSchemaAdd) {
      const leafCount = leafNames?.length || 0;

      const validation = validateParams({
        model: selectedModelFromSchema,
        values: scenarioParamValues,
        leafCount,
      });

      if (!validation.ok) {
        setToast({
          open: true,
          severity: "error",
          msg: validation.msg || "Invalid parameters.",
        });
        return;
      }

      modelParameters = cleanParamsForSend({
        model: selectedModelFromSchema,
        values: scenarioParamValues,
        leafCount,
      });
    } else {
      let parsedParams = {};
      try {
        parsedParams = paramsJson?.trim() ? JSON.parse(paramsJson) : {};
      } catch {
        setToast({
          open: true,
          severity: "error",
          msg: "Parameters JSON is not valid.",
        });
        return;
      }

      modelParameters = parsedParams;
    }

    try {
      setAddLoading(true);

      const response = await createIssueScenario({
        issueId: selectedIssue.id,
        scenarioName: scenarioName?.trim() || undefined,
        targetModelId: selectedModelId,
        paramOverrides: modelParameters,
      });

      if (!response?.success) {
        const msg = response?.message || "Could not add model.";
        setToast({ open: true, severity: "error", msg });
        return;
      }

      const scenarioId = response?.data?.scenarioId || null;

      await refreshRuns(selectedIssue.id);

      if (scenarioId) {
        setSelectedRunKey(scenarioId);
        const info = await ensureRunLoaded(scenarioId);
        setCurrentPhaseIndex(info ? getLastPhaseIndex(info) : 0);
      }

      setToast({
        open: true,
        severity: "success",
        msg: "Model run added.",
      });

      closeAddDialog();
    } catch (error) {
      const msg = error?.response?.data?.message || "Unexpected error adding model.";
      setToast({ open: true, severity: "error", msg });
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveSelectedRun = async () => {
    if (!selectedRunKey || selectedRunKey === "base") return;

    try {
      setRunsLoading(true);
      const response = await removeIssueScenario(selectedRunKey);

      if (!response?.success) {
        setToast({
          open: true,
          severity: "error",
          msg: response?.message || "Could not remove model.",
        });
        return;
      }

      setToast({
        open: true,
        severity: "success",
        msg: "Model removed.",
      });

      const removedKey = selectedRunKey;
      setSelectedRunKey("base");
      setRunCache((prev) => {
        const next = { ...prev };
        delete next[removedKey];
        return next;
      });

      await refreshRuns(selectedIssue.id);
    } catch {
      setToast({
        open: true,
        severity: "error",
        msg: "Unexpected error removing model.",
      });
    } finally {
      setRunsLoading(false);
    }
  };

  const selectedModelNameView =
    viewIssue?.summary?.model ||
    viewIssue?.summary?.modelName ||
    viewIssue?.summary?.targetModelName ||
    viewIssue?.summary?.selectedModel ||
    viewIssue?.modelParams?.base?.modelName ||
    issue?.modelParams?.base?.modelName ||
    "—";

  const selectedModelParamsViewRaw =
    viewIssue?.modelParams?.base?.paramsResolved ||
    viewIssue?.modelParams?.base?.paramsSaved ||
    viewIssue?.selectedScenario?.config?.normalizedModelParameters ||
    viewIssue?.selectedScenario?.config?.modelParameters ||
    viewIssue?.summary?.modelParameters ||
    viewIssue?.summary?.parameters ||
    viewIssue?.summary?.params ||
    viewIssue?.summary?.modelParams ||
    null;

  const selectedModelParamsView = selectedModelParamsViewRaw || {};
  const paramsPretty = safeJsonStringify(selectedModelParamsView);

  const baseModelName = issue?.modelParams?.base?.modelName || "—";

  const baseModelSchemaFromCatalog =
    availableModels.find((model) => (model?.name || model?.modelName) === baseModelName) ||
    null;

  const baseResolved =
    issue?.modelParams?.base?.paramsResolved ||
    issue?.modelParams?.base?.paramsSaved ||
    {};

  const baseSchemaParams = filterOutWeightsParams(
    baseModelSchemaFromCatalog?.parameters || issue?.modelParams?.base?.parameters || []
  );

  const baseParamsForViewer = baseSchemaParams?.length
    ? baseSchemaParams
    : buildPseudoParametersFromValues(baseResolved);

  const selectedRunModelName =
    viewIssue?.modelParams?.base?.modelName ||
    viewIssue?.summary?.targetModelName ||
    viewIssue?.summary?.modelName ||
    viewIssue?.summary?.model ||
    "—";

  const selectedResolved =
    viewIssue?.modelParams?.base?.paramsResolved ||
    viewIssue?.modelParams?.base?.paramsSaved ||
    viewIssue?.selectedScenario?.config?.normalizedModelParameters ||
    viewIssue?.selectedScenario?.config?.modelParameters ||
    {};

  const selectedModelSchemaFromCatalog =
    availableModels.find(
      (model) => (model?.name || model?.modelName) === selectedRunModelName
    ) || null;

  const selectedSchemaParams =
    selectedModelSchemaFromCatalog?.parameters ||
    viewIssue?.modelParams?.base?.parameters ||
    [];

  const selectedParamsForViewer = selectedSchemaParams?.length
    ? selectedSchemaParams
    : buildPseudoParametersFromValues(selectedResolved);
  const summaryParamsForViewer =
    selectedRunKey === "base" ? baseParamsForViewer : selectedParamsForViewer;
  const summaryResolvedParams =
    selectedRunKey === "base" ? baseResolved : selectedResolved;

  const selectedRunMeta = useMemo(
    () => runs.find((run) => getRunId(run) === selectedRunKey) || null,
    [runs, selectedRunKey]
  );

  const selectedRunLabel = selectedRunKey === "base" ? "Base" : getRunLabel(selectedRunMeta);

  const { rawOutput, modelExecution } = resolveModelSpecificOutput({
    viewIssue,
    currentPhaseIndex,
  });
  const rawOutputExists = hasModelSpecificOutput(rawOutput);

  const modelExecutionMeta = modelExecution
    ? {
        modelName: modelExecution?.modelName ?? null,
        modelKey: modelExecution?.modelKey ?? null,
        inputKind: modelExecution?.inputKind ?? null,
        outputKind: modelExecution?.outputKind ?? null,
        executedAt: formatExecutedAt(modelExecution?.executedAt ?? null),
      }
    : null;

  const rawOutputPretty = rawOutputExists ? safeJsonStringify(rawOutput) : "";

  return {
    dialog: {
      loadingInfo,
      issue,
      viewIssue,
    },
    header: {
      selectedIssue,
      selectedRunKey,
      selectedModelNameView,
      showRounds,
      currentPhaseIndex,
      roundsCount,
      handleChangePhase,
    },
    summarySection: {
      viewIssue,
      selectedModelNameView,
      selectedModelParamsView,
      paramsPretty,
      summaryParamsForViewer,
      summaryResolvedParams,
      leafNames,
      openDescriptionList,
      setOpenDescriptionList,
      openCriteriaList,
      setOpenCriteriaList,
      openAlternativeList,
      setOpenAlternativesList,
      openConsensusInfoList,
      setOpenConsensusInfoList,
      openExpertsList,
      setOpenExpertsList,
      totalExperts,
      participated,
      notAccepted,
    },
    rankingSection: {
      viewIssue,
      ranking,
      lastIndex,
      formatScore,
      isScenarioSelected,
    },
    analysisSection: {
      viewIssue,
      savedAnalysis,
      loadingAnalysis,
      generatingAnalysis,
      analysisError,
      handleGenerateOrRegenerateAnalysis,
      isScenarioSelected,
    },
    modelSpecificOutputSection: {
      rawOutput: rawOutputExists ? rawOutput : null,
      rawOutputPretty,
      modelExecution: modelExecutionMeta,
      hasOutput: rawOutputExists,
    },
    modelsSection: {
      selectedRunKey,
      handleRemoveSelectedRun,
      handleSelectRun,
      runs,
      runsLoading,
      viewIssue,
      getRunId,
      getRunLabel,
      openParamsViewer,
      setOpenParamsViewer,
      baseModelName,
      selectedRunModelName,
      domainType,
      baseParamsForViewer,
      baseResolved,
      leafNames,
      selectedRunLabel,
      selectedParamsForViewer,
      selectedResolved,
      addDialog: {
        addOpen,
        addLoading,
        closeAddDialog,
        openAddDialog,
        handleAddModelRun,
        scenarioName,
        setScenarioName,
        selectedModelId,
        setSelectedModelId,
        useSchemaAdd,
        availableModels,
        modelsCatalog,
        selectedModelFromSchema,
        scenarioParamValues,
        setScenarioParamValues,
        leafNames,
        paramsJson,
        setParamsJson,
        modelsLoading,
        domainType,
      },
    },
    graphsSection: {
      viewIssue,
      activeStep,
      handleNext,
      handleBack,
      currentPhaseIndex,
      scatterPlotRef,
      consensusLevelChartRef,
      resetZoom,
    },
    ratingsSection: {
      viewIssue,
      currentPhaseIndex,
      selectedExpert,
      setSelectedExpert,
      selectedCriterion,
      setSelectedCriterion,
      ratingsUi,
      expertList,
      criterionList,
      showCriterionSelector,
      showCollective,
      setShowCollective,
      evaluations,
      collectiveEvaluations,
      leafNames,
      hasSingleCriterion,
      evaluationStructure,
    },
    roundsNavigation: {
      showRounds,
      currentPhaseIndex,
      roundsCount,
      handleChangePhase,
      handlePreviousRound: () => handleChangePhase(currentPhaseIndex - 1),
      handleNextRound: () => handleChangePhase(currentPhaseIndex + 1),
    },
    notifications: {
      toast,
      setToast,
    },
    debug: {
      selectedRunMeta,
      ensureRunLoaded,
      refreshRuns,
      isModelCompatible,
      getCompatReason,
    },
  };
};

export default useFinishedIssueDialogView;
