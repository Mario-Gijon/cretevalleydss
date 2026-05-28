import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { createIssue } from "../../../services/issue.service";
import {
  readStoredCreateIssueData,
  setDefaults,
  steps,
  updateParamValues,
  validateIssueDescription,
  validateIssueName,
} from "../utils/createIssue.utils";
import {
  getCreateIssueModelParameters,
  pruneCreateIssueParameterValues,
} from "../../modelParameters";
import { getLeafCriteria } from "../../../utils/criteria.utils";
import {
  buildInitialExpressionDomainConfig,
  resolveAssignedDomainIdsFromExpressionDomainConfig,
  resolveExpressionDomainOptions,
  validateExpressionDomainConfig,
} from "../../../utils/domainAssignments.utils";
import {
  buildDefaultCriteriaWeightingConfig,
  buildDefaultFuzzyWeightVector,
  isFuzzyCriteriaWeightModel,
  modelUsesCriteriaWeights,
} from "../utils/criteriaWeighting.model";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";

const LOCAL_STORAGE_KEY = "prevCreateIssueData";
const CRITERIA_WEIGHTING_MODES = Object.freeze({
  CREATOR_FUZZY: "creatorFuzzy",
  CREATOR_MANUAL: "creatorManual",
  EXPERT_MANUAL: "expertManual",
  CREATOR_API_MODEL: "creatorApiModel",
  EXPERT_API_MODEL: "expertApiModel",
});

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeStoredConsensusThreshold = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeStoredConsensusMaxPhases = (value) => {
  if (value === null) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }

  return null;
};

const buildDefaultFuzzyWeightsByCriterion = ({
  leafCriteria,
  fuzzyValueCount,
}) => {
  const names = (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion) => criterion?.name)
    .filter(Boolean);
  if (!Number.isInteger(fuzzyValueCount) || fuzzyValueCount < 2 || names.length === 0) {
    return {};
  }

  const isSingleCriterion = names.length === 1;
  const baseVector = isSingleCriterion
    ? Array.from({ length: fuzzyValueCount }, () => 1)
    : buildDefaultFuzzyWeightVector(fuzzyValueCount);

  return names.reduce((accumulator, criterionName) => {
    accumulator[criterionName] = [...baseVector];
    return accumulator;
  }, {});
};

const isCriteriaWeightingConfigOnDefault = ({
  selectedModel,
  criteriaWeightingConfig,
  leafCriteria,
  fuzzyValueCount,
}) => {
  const expectedDefault = buildDefaultCriteriaWeightingConfig(selectedModel, leafCriteria);
  if (!modelUsesCriteriaWeights(selectedModel)) {
    return criteriaWeightingConfig == null;
  }
  if (!isPlainObject(criteriaWeightingConfig) || !isPlainObject(expectedDefault)) {
    return false;
  }

  if (!isFuzzyCriteriaWeightModel(selectedModel)) {
    const leafNames = (Array.isArray(leafCriteria) ? leafCriteria : [])
      .map((criterion) => criterion?.name)
      .filter(Boolean);

    if (leafNames.length === 1) {
      const onlyLeaf = leafNames[0];
      const isCreatorManualForSingleLeaf =
        criteriaWeightingConfig.mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL &&
        criteriaWeightingConfig.source === "creator" &&
        criteriaWeightingConfig.method === "manual" &&
        criteriaWeightingConfig.structureKey === "manualCriteriaWeights" &&
        (isDeepEqual(criteriaWeightingConfig?.payload?.weightsByCriterion || {}, {}) ||
          isDeepEqual(criteriaWeightingConfig?.payload?.weightsByCriterion || {}, { [onlyLeaf]: 1 }));

      if (isCreatorManualForSingleLeaf) {
        return true;
      }
    }

    return isDeepEqual(criteriaWeightingConfig, expectedDefault);
  }

  const expectedFuzzyWeights = buildDefaultFuzzyWeightsByCriterion({
    leafCriteria,
    fuzzyValueCount,
  });
  const currentFuzzyWeights = criteriaWeightingConfig?.payload?.weightsByCriterion;
  const fuzzyWeightsOnDefault =
    isDeepEqual(currentFuzzyWeights || {}, {}) ||
    isDeepEqual(currentFuzzyWeights || {}, expectedFuzzyWeights);

  return (
    criteriaWeightingConfig.mode === expectedDefault.mode &&
    criteriaWeightingConfig.source === expectedDefault.source &&
    criteriaWeightingConfig.method === expectedDefault.method &&
    criteriaWeightingConfig.structureKey === expectedDefault.structureKey &&
    fuzzyWeightsOnDefault
  );
};

const resolveAssignedFuzzyValueCount = ({
  expressionDomainConfig,
  leafCriteria,
  globalDomains,
  expressionDomains,
}) => {
  const assignedDomainIds = resolveAssignedDomainIdsFromExpressionDomainConfig({
    expressionDomainConfig,
    leafCriteria,
  });

  if (!assignedDomainIds.length) {
    return null;
  }

  const domainDocs = [
    ...(Array.isArray(globalDomains) ? globalDomains : []),
    ...(Array.isArray(expressionDomains) ? expressionDomains : []),
  ];
  const domainById = new Map(
    domainDocs
      .map((domain) => [String(domain?.id || domain?._id || "").trim(), domain])
      .filter(([id]) => id.length > 0)
  );

  const valueCounts = new Set();
  for (const domainId of assignedDomainIds) {
    const domain = domainById.get(domainId);
    if (domain?.type !== "linguistic") continue;

    const valueCount = Number(domain?.valueCount);
    if (!Number.isInteger(valueCount) || valueCount < 2) {
      return null;
    }

    valueCounts.add(valueCount);
  }

  return valueCounts.size === 1 ? Array.from(valueCounts)[0] : null;
};

const validateCreatorManualConfig = ({ criteriaWeightingConfig, leafCriteria }) => {
  const payload = criteriaWeightingConfig?.payload;
  const weightsByCriterion = payload?.weightsByCriterion;

  if (!isPlainObject(weightsByCriterion)) {
    return "Manual mode requires weights by criterion.";
  }

  const criterionNames = leafCriteria.map((criterion) => criterion?.name).filter(Boolean);
  const expectedKeySet = new Set(criterionNames);

  const unknownKeys = Object.keys(weightsByCriterion).filter(
    (criterionName) => !expectedKeySet.has(criterionName)
  );
  if (unknownKeys.length > 0) {
    return `Unknown criteria in manual weights: ${unknownKeys.join(", ")}`;
  }

  const weights = criterionNames.map((criterionName) =>
    Number(weightsByCriterion[criterionName])
  );

  if (weights.some((value) => !Number.isFinite(value))) {
    return "Manual mode requires numeric weights for all criteria.";
  }

  if (weights.some((value) => value < 0 || value > 1)) {
    return "Manual weights must be between 0 and 1.";
  }

  const total = weights.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > 0.001) {
    return "Manual weights must sum to 1.";
  }

  return null;
};

const validateCreatorFuzzyConfig = ({
  criteriaWeightingConfig,
  leafCriteria,
  fuzzyValueCount,
}) => {
  const payload = criteriaWeightingConfig?.payload;
  const weightsByCriterion = payload?.weightsByCriterion;

  if (!isPlainObject(weightsByCriterion)) {
    return "Fuzzy criteria weights are required.";
  }

  const criterionNames = leafCriteria.map((criterion) => criterion?.name).filter(Boolean);
  if (!Number.isInteger(fuzzyValueCount) || fuzzyValueCount < 2) {
    return "Fuzzy criteria weights require a consistent linguistic value count.";
  }

  for (const criterionName of criterionNames) {
    const vector = weightsByCriterion[criterionName];
    if (!Array.isArray(vector) || vector.length !== fuzzyValueCount) {
      return `Fuzzy weight for '${criterionName}' must contain ${fuzzyValueCount} values.`;
    }

    const numericVector = vector.map(Number);
    if (numericVector.some((item) => !Number.isFinite(item))) {
      return `Fuzzy weight for '${criterionName}' must contain valid numbers.`;
    }

    if (numericVector.some((item) => item < 0 || item > 1)) {
      return `Fuzzy weight for '${criterionName}' must stay within [0, 1].`;
    }

    for (let index = 1; index < numericVector.length; index += 1) {
      if (numericVector[index] < numericVector[index - 1]) {
        return `Fuzzy weight for '${criterionName}' must be non-decreasing.`;
      }
    }
  }

  return null;
};

dayjs.extend(utc);

const isDeepEqual = (left, right) => {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return false;
    return left.every((item, index) => isDeepEqual(item, right[index]));
  }
  if (
    left &&
    right &&
    typeof left === "object" &&
    typeof right === "object" &&
    !Array.isArray(left) &&
    !Array.isArray(right)
  ) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => isDeepEqual(left[key], right[key]));
  }
  return false;
};

/**
 * Gestiona el estado y reglas del flujo createIssue.
 *
 * Mantiene fuera del componente de presentación toda la lógica de
 * persistencia local, validaciones, efectos derivados y creación final.
 *
 * @returns {Object}
 */
export const useCreateIssueFlow = () => {
  const { loading, setLoading, setIssueCreated, globalDomains, expressionDomains } =
    useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const navigate = useNavigate();

  const storedData = useMemo(
    () => readStoredCreateIssueData(LOCAL_STORAGE_KEY),
    []
  );

  const [activeStep, setActiveStep] = useState(storedData.activeStep || 0);
  const [completed] = useState(storedData.completed || {});
  const [selectedModel, setSelectedModel] = useState(storedData.selectedModel || null);
  const [showConsensusModels, setShowConsensusModels] = useState(
    storedData.showConsensusModels === true
  );
  const [alternatives, setAlternatives] = useState(storedData.alternatives || []);
  const [criteria, setCriteria] = useState(storedData.criteria || []);
  const [addedExperts, setAddedExperts] = useState(storedData.addedExperts || []);
  const [issueName, setIssueName] = useState(storedData.issueName || "");
  const [issueDescription, setIssueDescription] = useState(
    storedData.issueDescription || ""
  );
  const [issueNameError, setIssueNameError] = useState("");
  const [issueDescriptionError, setIssueDescriptionError] = useState(false);
  const [closureDate, setClosureDate] = useState(null);
  const [closureDateError, setClosureDateError] = useState(false);
  const storedConsensusMaxPhases = normalizeStoredConsensusMaxPhases(
    storedData.consensusMaxPhases
  );
  const storedConsensusThreshold = normalizeStoredConsensusThreshold(
    storedData.consensusThreshold
  );
  const [consensusMaxPhases, setConsensusMaxPhases] = useState(
    storedConsensusMaxPhases === null || storedConsensusMaxPhases > 0
      ? storedConsensusMaxPhases ?? 3
      : 3
  );
  const [consensusThreshold, setConsensusThreshold] = useState(
    storedConsensusThreshold !== null ? storedConsensusThreshold : 0.7
  );
  const [simulateConsensus, setSimulateConsensus] = useState(
    storedData.simulateConsensus === true
  );
  const [paramValues, setParamValues] = useState(storedData.paramValues || {});
  const [defaultModelParams, setDefaultModelParams] = useState(true);
  const [expressionDomainConfig, setExpressionDomainConfig] = useState(
    isPlainObject(storedData.expressionDomainConfig)
      ? storedData.expressionDomainConfig
      : {
        mode: "global",
        globalDomainId: "",
      }
  );
  const [criteriaWeightingConfig, setCriteriaWeightingConfig] = useState(
    isPlainObject(storedData.criteriaWeightingConfig)
      ? storedData.criteriaWeightingConfig
      : buildDefaultCriteriaWeightingConfig(storedData.selectedModel || null)
  );
  const effectiveIsConsensus = selectedModel?.supportsConsensus === true;
  const modelSupportsConsensusSimulation =
    selectedModel?.supportsConsensusSimulation === true;

  useEffect(() => {
    const dataToSave = {
      activeStep,
      completed,
      selectedModel,
      showConsensusModels,
      isConsensus: effectiveIsConsensus,
      alternatives,
      criteria,
      addedExperts,
      issueName,
      issueDescription,
      expressionDomainConfig,
      paramValues,
      criteriaWeightingConfig,
      closureDate: closureDate ? closureDate.toJSON() : null,
      ...(effectiveIsConsensus && {
        consensusMaxPhases,
        consensusThreshold,
      }),
      simulateConsensus,
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [
    activeStep,
    completed,
    selectedModel,
    showConsensusModels,
    effectiveIsConsensus,
    alternatives,
    criteria,
    addedExperts,
    issueName,
    issueDescription,
    closureDate,
    consensusMaxPhases,
    consensusThreshold,
    expressionDomainConfig,
    paramValues,
    criteriaWeightingConfig,
    simulateConsensus,
  ]);

  useEffect(() => {
    if (!effectiveIsConsensus || !modelSupportsConsensusSimulation) {
      setSimulateConsensus(false);
    }
  }, [effectiveIsConsensus, modelSupportsConsensusSimulation]);

  useEffect(() => {
    if (selectedModel) {
      const leafCriteria = getLeafCriteria(criteria);
      try {
        setParamValues(
          setDefaults({
            selectedModel,
            criteria: leafCriteria,
          })
        );
      } catch {
        showSnackbarAlert("No se pudieron mostrar los parámetros del modelo.", "error");
        return;
      }
      setDefaultModelParams(true);
      setCriteriaWeightingConfig(
        buildDefaultCriteriaWeightingConfig(selectedModel, leafCriteria)
      );
      return;
    }
    setCriteriaWeightingConfig(buildDefaultCriteriaWeightingConfig(selectedModel, []));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  useEffect(() => {
    const leafCriteria = getLeafCriteria(criteria);
    setExpressionDomainConfig((previous) =>
      buildInitialExpressionDomainConfig({
        selectedModel,
        leafCriteria,
        currentConfig: previous,
        globalDomains,
        expressionDomains,
      })
    );
  }, [criteria, expressionDomains, globalDomains, selectedModel]);

  useEffect(() => {
    try {
      setParamValues((previous) =>
        updateParamValues(previous, selectedModel, getLeafCriteria(criteria))
      );
    } catch {
      showSnackbarAlert("No se pudieron mostrar los parámetros del modelo.", "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria, selectedModel]);

  useEffect(() => {
    if (!selectedModel) {
      if (defaultModelParams !== true) setDefaultModelParams(true);
      return;
    }

    const leafCriteria = getLeafCriteria(criteria);
    const fuzzyValueCount = resolveAssignedFuzzyValueCount({
      expressionDomainConfig,
      leafCriteria,
      globalDomains,
      expressionDomains,
    });
    let defaults = {};
    try {
      defaults = setDefaults({
        selectedModel,
        criteria: leafCriteria,
      });
    } catch {
      return;
    }

    const parameterKeys = getCreateIssueModelParameters(selectedModel)
      .map((parameter) => parameter?.key)
      .filter(Boolean);

    const areParamsOnDefault = parameterKeys.every((key) =>
      isDeepEqual(paramValues?.[key], defaults?.[key])
    );
    const isCriteriaWeightingOnDefault = isCriteriaWeightingConfigOnDefault({
      selectedModel,
      criteriaWeightingConfig,
      leafCriteria,
      fuzzyValueCount,
    });
    const isOnDefault = areParamsOnDefault && isCriteriaWeightingOnDefault;

    if (isOnDefault !== defaultModelParams) {
      setDefaultModelParams(isOnDefault);
    }
  }, [
    criteria,
    criteriaWeightingConfig,
    defaultModelParams,
    expressionDomainConfig,
    expressionDomains,
    globalDomains,
    paramValues,
    selectedModel,
  ]);

  /**
   * Valida y actualiza el nombre del issue.
   *
   * @param {string} newIssueName Nuevo nombre.
   * @returns {void}
   */
  const handleValidateIssueName = (newIssueName) => {
    validateIssueName(newIssueName, setIssueNameError);
    setIssueName(newIssueName);
  };

  /**
   * Valida y actualiza la descripción del issue.
   *
   * @param {string} newIssueDescription Nueva descripción.
   * @returns {void}
   */
  const handleValidateIssueDescription = (newIssueDescription) => {
    validateIssueDescription(newIssueDescription, setIssueDescriptionError);
    setIssueDescription(newIssueDescription);
  };

  /**
   * Evalúa si la fecha de cierre es válida respecto al día actual.
   *
   * @param {Object|null} selectedDate Fecha seleccionada.
   * @returns {void}
   */
  const handleClosureDateError = (selectedDate) => {
    if (!selectedDate) {
      setClosureDateError(false);
      if (closureDate) handleClosureDateError(closureDate);
      return;
    }

    const closureDateObj = dayjs(selectedDate);
    const today = dayjs().startOf("day");

    if (selectedDate) {
      if (closureDateObj.isBefore(today.add(2, "day"), "day")) {
        setClosureDateError(true);
        showSnackbarAlert("Closure date is not valid", "error");
        return;
      }
    }

    setClosureDateError(false);
  };

  const allData = useMemo(() => {
    return {
      issueName,
      issueDescription,
      selectedModel,
      isConsensus: effectiveIsConsensus,
      alternatives,
      criteria,
      addedExperts,
      closureDate: closureDate ? dayjs(closureDate).startOf("day").toDate() : null,
      expressionDomainConfig,
      criteriaWeightingConfig,
      paramValues,
      ...(effectiveIsConsensus && { consensusMaxPhases, consensusThreshold }),
      simulateConsensus,
    };
  }, [
    issueName,
    issueDescription,
    selectedModel,
    effectiveIsConsensus,
    alternatives,
    criteria,
    addedExperts,
    closureDate,
    expressionDomainConfig,
    criteriaWeightingConfig,
    paramValues,
    consensusMaxPhases,
    consensusThreshold,
    simulateConsensus,
  ]);

  /**
   * Ejecuta la creación final del issue si todas las validaciones pasan.
   *
   * @returns {Promise<void>}
   */
  const handleComplete = async () => {
    handleClosureDateError();

    if (closureDateError) return;
    if (issueNameError) return;

    validateIssueName(issueName, setIssueNameError);
    validateIssueDescription(issueDescription, setIssueDescriptionError);

    if (!issueName || !issueDescription || issueNameError || issueDescriptionError) {
      return;
    }

    const modelRequiresConsensus = selectedModel?.supportsConsensus === true;

    const { validDomainIdSet } = resolveExpressionDomainOptions(
      selectedModel,
      globalDomains,
      expressionDomains
    );

    if (
      !validateExpressionDomainConfig({
        expressionDomainConfig,
        leafCriteria: getLeafCriteria(criteria),
        validDomainIdSet,
      })
    ) {
      showSnackbarAlert(
        "You must assign a compatible expression domain to every leaf criterion before creating the issue.",
        "error"
      );
      return;
    }

    const leafCriteria = getLeafCriteria(criteria);
    if (selectedModel?.isMultiCriteria !== true && leafCriteria.length > 1) {
      showSnackbarAlert("This model does not support multiple criteria.", "error");
      return;
    }

    const rawConsensusThreshold = consensusThreshold;
    const normalizedConsensusThreshold = Number(rawConsensusThreshold);
    if (
      modelRequiresConsensus &&
      (
        rawConsensusThreshold === "" ||
        !Number.isFinite(normalizedConsensusThreshold) ||
        normalizedConsensusThreshold < 0 ||
        normalizedConsensusThreshold > 1
      )
    ) {
      showSnackbarAlert(
        "Consensus threshold must be a finite number between 0 and 1.",
        "error"
      );
      return;
    }

    const normalizedConsensusMaxPhases =
      consensusMaxPhases === null || consensusMaxPhases === undefined || consensusMaxPhases === ""
        ? null
        : Number(consensusMaxPhases);
    if (
      modelRequiresConsensus &&
      normalizedConsensusMaxPhases !== null &&
      (
        !Number.isFinite(normalizedConsensusMaxPhases) ||
        !Number.isInteger(normalizedConsensusMaxPhases) ||
        normalizedConsensusMaxPhases <= 0
      )
    ) {
      showSnackbarAlert(
        "Max consensus rounds must be a positive integer or unlimited.",
        "error"
      );
      return;
    }

    const modelNeedsCriteriaWeights = modelUsesCriteriaWeights(selectedModel);
    if (modelNeedsCriteriaWeights) {
      if (!criteriaWeightingConfig || typeof criteriaWeightingConfig !== "object") {
        showSnackbarAlert("Criteria weighting configuration is required.", "error");
        return;
      }
    }

    if (
      modelNeedsCriteriaWeights &&
      criteriaWeightingConfig.mode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY
    ) {
      const fuzzyValueCount = resolveAssignedFuzzyValueCount({
        expressionDomainConfig,
        leafCriteria,
        globalDomains,
        expressionDomains,
      });
      const fuzzyValidationError = validateCreatorFuzzyConfig({
        criteriaWeightingConfig,
        leafCriteria,
        fuzzyValueCount,
      });
      if (fuzzyValidationError) {
        showSnackbarAlert(fuzzyValidationError, "error");
        return;
      }
    }

    if (modelNeedsCriteriaWeights && leafCriteria.length > 1) {
      if (criteriaWeightingConfig.mode === CRITERIA_WEIGHTING_MODES.CREATOR_MANUAL) {
        const manualValidationError = validateCreatorManualConfig({
          criteriaWeightingConfig,
          leafCriteria,
        });
        if (manualValidationError) {
          showSnackbarAlert(manualValidationError, "error");
          return;
        }
      }

    }

    setLoading(true);

    const issueInfoPayload = { ...allData };
    issueInfoPayload.isConsensus = modelRequiresConsensus;
    issueInfoPayload.simulateConsensus =
      modelRequiresConsensus && modelSupportsConsensusSimulation && simulateConsensus;
    if (modelRequiresConsensus) {
      issueInfoPayload.consensusThreshold = normalizedConsensusThreshold;
      issueInfoPayload.consensusMaxPhases = normalizedConsensusMaxPhases;
    }
    issueInfoPayload.paramValues = pruneCreateIssueParameterValues({
      selectedModel,
      values: paramValues,
    });
    issueInfoPayload.criteriaWeightingParameters =
      criteriaWeightingConfig?.criteriaWeightingParameters &&
      typeof criteriaWeightingConfig.criteriaWeightingParameters === "object" &&
      !Array.isArray(criteriaWeightingConfig.criteriaWeightingParameters)
        ? criteriaWeightingConfig.criteriaWeightingParameters
        : {};

    const result = await createIssue({
      ...issueInfoPayload,
      selectedModelId: selectedModel?._id || null,
    });

    if (result.success) {
      setIssueCreated(result);
      /* localStorage.removeItem(LOCAL_STORAGE_KEY); */
      navigate("/dashboard", { replace: true });
      window.requestAnimationFrame(() => {
        setLoading(false);
      });
      return;
    }

    if (result.error?.field === "issueName") {
      setIssueNameError(result.message);
    }

    showSnackbarAlert(result.message, "error");
    setLoading(false);
  };

  /**
   * Mueve el flujo al paso indicado.
   *
   * @param {number} stepIndex Índice de paso.
   * @returns {void}
   */
  const goToStep = (stepIndex) => {
    setActiveStep(stepIndex);
  };

  /**
   * Avanza al siguiente paso.
   *
   * @returns {void}
   */
  const goNextStep = () => {
    setActiveStep((previous) => previous + 1);
  };

  /**
   * Retrocede al paso anterior.
   *
   * @returns {void}
   */
  const goPrevStep = () => {
    setActiveStep((previous) => previous - 1);
  };

  const headerSubtitle = useMemo(() => {
    const label = steps?.[activeStep] ?? "";
    const total = steps?.length ?? 0;
    return `${label} • Step ${activeStep + 1}/${total}`;
  }, [activeStep]);

  return {
    loading,
    activeStep,
    completed,
    selectedModel,
    isConsensus: effectiveIsConsensus,
    alternatives,
    criteria,
    addedExperts,
    issueName,
    issueDescription,
    issueNameError,
    issueDescriptionError,
    closureDate,
    closureDateError,
    consensusMaxPhases,
    consensusThreshold,
    simulateConsensus,
    paramValues,
    defaultModelParams,
    expressionDomainConfig,
    criteriaWeightingConfig,
    allData,
    showConsensusModels,
    headerSubtitle,
    setSelectedModel,
    setShowConsensusModels,
    setAlternatives,
    setCriteria,
    setAddedExperts,
    setClosureDate,
    setConsensusMaxPhases,
    setConsensusThreshold,
    setSimulateConsensus,
    setParamValues,
    setDefaultModelParams,
    setExpressionDomainConfig,
    setCriteriaWeightingConfig,
    handleValidateIssueName,
    handleValidateIssueDescription,
    handleClosureDateError,
    handleComplete,
    goToStep,
    goNextStep,
    goPrevStep,
  };
};

export default useCreateIssueFlow;
