import { useEffect, useMemo, useRef, useState } from "react";

import {
  createIssueScenario,
  getFinishedIssueInfo,
  getIssueScenarioById,
  getIssueScenarios,
  getModelsInfo,
  removeIssueScenario,
} from "../../../services/issue.service";
import { useFinishedIssueRatingsView } from "./useFinishedIssueRatingsView.js";
import {
  applyScenarioToIssueInfo,
} from "../logic/buildFinishedIssueView";
import {
  buildParamsResolved,
  buildPseudoParametersFromValues,
  cleanParamsForSend,
  filterOutWeightsParams,
  modelUsesScenarioCriteriaWeights,
  validateScenarioCriteriaWeights,
  validateParams,
} from "../logic/buildFinishedScenarioParameters";
import {
  getCompatReason,
  isModelCompatible,
} from "../logic/buildFinishedScenarioRuns";
import {
  getLastPhaseIndex,
  getLeafCriteriaNamesFallback,
  getRoundsCount,
  hasSingleLeafCriterion,
} from "../logic/selectFinishedIssuePhase";
import { buildFinishedModelOutputView } from "../logic/buildFinishedModelOutputView";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";

const unwrap = (response) =>
  response && typeof response === "object" && "data" in response
    ? response.data
    : response;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const safeJsonStringify = (value) => {
  try {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return JSON.stringify(JSON.parse(trimmed), null, 2);
      }
      return value;
    }

    return JSON.stringify(value, null, 2);
  } catch {
    return typeof value === "string" ? value : String(value);
  }
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

  const [runsLoading, setRunsLoading] = useState(false);
  const [runs, setRuns] = useState([]);
  const [selectedRunKey, setSelectedRunKey] = useState("base");
  const [runCache, setRunCache] = useState({});

  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  const [selectedModelId, setSelectedModelId] = useState("");
  const [scenarioParamValues, setScenarioParamValues] = useState({});
  const [scenarioWeightsError, setScenarioWeightsError] = useState("");

  const [modelsCatalog, setModelsCatalog] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [paramsJson, setParamsJson] = useState("{}");

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
        setOpenDescriptionList(false);
        setOpenCriteriaList(false);
        setOpenAlternativesList(false);
        setOpenConsensusInfoList(false);
        setOpenExpertsList(false);
        setOpenParamsViewer(false);

        setSelectedModelId("");
        setScenarioParamValues({});
        setScenarioWeightsError("");
        setScenarioName("");
        setParamsJson("{}");

      } catch {
        if (cancelled || openTokenRef.current !== token) return;
        setIssue({});
        setRuns([]);
        setSelectedRunKey("base");
        setRunCache({});
        setCurrentPhaseIndex(0);
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

  const ensureRunLoaded = async (runKey) => {
    if (!runKey || runKey === "base") return null;

    const cached = runCache[runKey];
    if (cached) return cached;

    try {
      setRunsLoading(true);
      const response = unwrap(await getIssueScenarioById(runKey));
      const scenario = response?.scenario || response || null;

      if (!scenario?.outputs?.standardResult) {
        showSnackbarAlert("Scenario results not available yet.", "warning");
        return null;
      }

      const info = applyScenarioToIssueInfo(baseIssueRef.current || issue, scenario);
      setRunCache((prev) => ({ ...prev, [runKey]: info }));
      return info;
    } catch {
      showSnackbarAlert("Could not load scenario.", "error");
      return null;
    } finally {
      setRunsLoading(false);
    }
  };

  const handleSelectRun = async (runKey) => {
    setSelectedRunKey(runKey);
    setActiveStep(0);

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

  const selectedPhase = currentPhaseIndex;

  const baseModelParamsBlock = issue?.modelParams || null;
  const availableModelsRaw = baseModelParamsBlock?.availableModels;
  const baseIssueWeights = useMemo(() => {
    const weightsFromSaved = issue?.modelParams?.base?.paramsSaved?.weights;
    if (isPlainObject(weightsFromSaved)) return weightsFromSaved;
    const weightsFromResolved = issue?.modelParams?.base?.paramsResolved?.weights;
    if (isPlainObject(weightsFromResolved)) return weightsFromResolved;
    const weightsFromResult = issue?.finalCriteriaWeights?.weightsByCriterion;
    if (isPlainObject(weightsFromResult)) return weightsFromResult;
    return {};
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
  const leafCriteriaForParams = useMemo(
    () =>
      Array.isArray(baseModelParamsBlock?.leafCriteria)
        ? baseModelParamsBlock.leafCriteria
            .map((criterion, index) => {
              const id =
                String(criterion?.id || criterion?._id || "").trim() || null;
              const name =
                String(criterion?.name || "").trim() ||
                `Criterion ${index + 1}`;
              if (!id) return null;
              return { id, name };
            })
            .filter(Boolean)
        : [],
    [baseModelParamsBlock?.leafCriteria]
  );

  const viewIssue =
    selectedRunKey === "base" ? issue : runCache[selectedRunKey] || null;
  const isScenarioSelected = selectedRunKey !== "base";

  const hasSingleCriterion = useMemo(
    () => hasSingleLeafCriterion(viewIssue || issue),
    [viewIssue, issue]
  );

  const roundsCount = getRoundsCount(viewIssue || {});
  const showRounds = Boolean(viewIssue?.summary?.consensusInfo && roundsCount > 1);

  const ratingsView = useFinishedIssueRatingsView({
    viewIssue,
    currentPhaseIndex,
    leafCriteria: leafCriteriaForParams,
  });

  const ranking =
    (Array.isArray(viewIssue?.alternativesRankings)
      ? viewIssue.alternativesRankings.find(
        (entry) => Number(entry?.phase) === Number(selectedPhase)
      )
      : null)?.rankedAlternatives ?? [];
  const lastIndex = ranking.length - 1;

  const formatScore = (number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(number);

  const handleChangePhase = (index) => {
    setCurrentPhaseIndex(index);
    setActiveStep(0);
  };

  const participated = viewIssue?.summary?.experts?.participated || [];
  const notAccepted = viewIssue?.summary?.experts?.notAccepted || [];
  const totalExperts = participated.length + notAccepted.length;

  const getRunId = (run) => run?._id || run?.id || run?.scenarioId || run?.runId;
  const getRunLabel = (run) => {
    const customName = run?.name || run?.scenarioName;
    if (customName) return customName;

    return run?.targetModelName || run?.modelName || "Model run";
  };

  const useSchemaAdd = Array.isArray(availableModelsRaw);

  const selectedModelFromSchema = useMemo(() => {
    if (!useSchemaAdd) return null;
    return availableModels.find((model) => model?.id === selectedModelId) || null;
  }, [useSchemaAdd, availableModels, selectedModelId]);
  const selectedModelCompatible = useMemo(
    () => (selectedModelFromSchema ? isModelCompatible(selectedModelFromSchema) : false),
    [selectedModelFromSchema]
  );

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
    setScenarioWeightsError("");
    setParamsJson("{}");
  };

  useEffect(() => {
    if (!addOpen) return;
    if (!useSchemaAdd) return;
    if (!selectedModelFromSchema) return;

    const defaults = buildParamsResolved({
      model: selectedModelFromSchema,
      leafCount: leafNames.length,
      leafCriteria: leafCriteriaForParams,
    });

    setScenarioParamValues(defaults);
    setScenarioWeightsError("");
  }, [addOpen, useSchemaAdd, selectedModelFromSchema, leafNames, leafCriteriaForParams]);

  const restoreScenarioDefaults = () => {
    if (!selectedModelFromSchema) return;
    const defaults = buildParamsResolved({
      model: selectedModelFromSchema,
      leafCount: leafNames.length,
      leafCriteria: leafCriteriaForParams,
    });
    setScenarioParamValues(defaults);
    setScenarioWeightsError("");
  };

  const handleAddModelRun = async () => {
    if (!selectedIssue?.id) return;

    if (!selectedModelId) {
      showSnackbarAlert("Please select a model.", "warning");
      return;
    }
    if (useSchemaAdd && selectedModelFromSchema && !selectedModelCompatible) {
      showSnackbarAlert("Selected model is not compatible with this issue scenario.", "error");
      return;
    }

    let modelParameters = {};

    if (useSchemaAdd) {
      const leafCount = leafNames?.length || 0;
      const modelNeedsCriteriaWeights =
        modelUsesScenarioCriteriaWeights(selectedModelFromSchema);
      let normalizedScenarioWeights = null;

      if (modelNeedsCriteriaWeights) {
        const weightsValidation = validateScenarioCriteriaWeights({
          weights: scenarioParamValues?.weights,
          leafCriteria: leafCriteriaForParams,
          leafCount,
        });

        if (!weightsValidation.ok) {
          setScenarioWeightsError(weightsValidation.msg || "Invalid criteria weights.");
          showSnackbarAlert(weightsValidation.msg || "Invalid criteria weights.", "error");
          return;
        }

        normalizedScenarioWeights = weightsValidation.normalized;
        setScenarioWeightsError("");
      }

      const validation = validateParams({
        model: selectedModelFromSchema,
        values: scenarioParamValues,
        leafCount,
        leafCriteria: leafCriteriaForParams,
      });

      if (!validation.ok) {
        showSnackbarAlert(validation.msg || "Invalid parameters.", "error");
        return;
      }

      modelParameters = cleanParamsForSend({
        model: selectedModelFromSchema,
        values: scenarioParamValues,
        leafCount,
        leafCriteria: leafCriteriaForParams,
      });

      if (modelNeedsCriteriaWeights) {
        modelParameters.weights = isPlainObject(normalizedScenarioWeights)
          ? normalizedScenarioWeights
          : {};
      }
    } else {
      let parsedParams = {};
      try {
        parsedParams = paramsJson?.trim() ? JSON.parse(paramsJson) : {};
      } catch {
        showSnackbarAlert("Parameters JSON is not valid.", "error");
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
        showSnackbarAlert(msg, "error");
        return;
      }

      const scenarioId = response?.data?.scenarioId || null;

      await refreshRuns(selectedIssue.id);

      if (scenarioId) {
        setSelectedRunKey(scenarioId);
        const info = await ensureRunLoaded(scenarioId);
        setCurrentPhaseIndex(info ? getLastPhaseIndex(info) : 0);
      }

      showSnackbarAlert("Model run added.", "success");

      closeAddDialog();
    } catch (error) {
      const msg = error?.response?.data?.message || "Unexpected error adding model.";
      showSnackbarAlert(msg, "error");
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
        showSnackbarAlert(response?.message || "Could not remove model.", "error");
        return;
      }

      showSnackbarAlert("Model removed.", "success");

      const removedKey = selectedRunKey;
      setSelectedRunKey("base");
      setRunCache((prev) => {
        const next = { ...prev };
        delete next[removedKey];
        return next;
      });

      await refreshRuns(selectedIssue.id);
    } catch {
      showSnackbarAlert("Unexpected error removing model.", "error");
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

  const {
    rawOutput,
    rawOutputExists,
    modelExecution,
  } = buildFinishedModelOutputView({
    viewIssue,
    currentPhaseIndex,
  });
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
    modelSpecificOutputSection: {
      rawOutput: rawOutputExists ? rawOutput : null,
      rawOutputPretty,
      modelExecution,
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
        selectedModelCompatible,
        restoreScenarioDefaults,
        scenarioParamValues,
        setScenarioParamValues,
        scenarioWeightsError,
        clearScenarioWeightsError: () => setScenarioWeightsError(""),
        leafNames,
        leafCriteria: leafCriteriaForParams,
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
      leafNames,
      leafCriteria: leafCriteriaForParams,
      hasSingleCriterion,
      ...ratingsView,
    },
    roundsNavigation: {
      showRounds,
      currentPhaseIndex,
      roundsCount,
      handleChangePhase,
      handlePreviousRound: () => handleChangePhase(currentPhaseIndex - 1),
      handleNextRound: () => handleChangePhase(currentPhaseIndex + 1),
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
