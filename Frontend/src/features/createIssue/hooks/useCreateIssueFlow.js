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
import { getLeafCriteria } from "../../../utils/criteria.utils";
import {
  buildInitialAssignments,
  validateDomainAssigments,
} from "../../../utils/domainAssignments.utils";
import {
  isFuzzyCriteriaWeightModel,
  resolveFuzzyCriteriaWeightValueCount,
} from "../utils/criteriaWeighting.model";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";

const LOCAL_STORAGE_KEY = "prevCreateIssueData";
const CRITERIA_WEIGHTING_MODES = Object.freeze({
  CREATOR_FUZZY: "creatorFuzzy",
  CREATOR_MANUAL: "creatorManual",
  EXPERT_MANUAL: "expertManual",
  CREATOR_BWM: "creatorBwm",
  EXPERT_BWM: "expertBwm",
  EXPERT_BWM_CMCC: "expertBwmCmcc",
});


const buildDefaultCriteriaWeightingConfig = (selectedModel) => {
  if (isFuzzyCriteriaWeightModel(selectedModel)) {
    return {
      mode: CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY,
      source: "creator",
      method: "fuzzy",
      aggregationMode: "none",
      structureKey: "fuzzyCriteriaWeights",
      payload: {},
    };
  }

  const preferredStructureKey = selectedModel?.criteriaWeightingStructureKey;

  if (preferredStructureKey === "bestWorstCriteria") {
    return {
      mode: CRITERIA_WEIGHTING_MODES.EXPERT_BWM,
      source: "experts",
      method: "bwm",
      aggregationMode: "bwmMean",
      structureKey: "bestWorstCriteria",
      payload: {},
    };
  }

  return {
    mode: CRITERIA_WEIGHTING_MODES.EXPERT_MANUAL,
    source: "experts",
    method: "manual",
    aggregationMode: "mean",
    structureKey: "manualCriteriaWeights",
    payload: {},
  };
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

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

const validateCreatorBwmConfig = ({ criteriaWeightingConfig, leafCriteria }) => {
  const payload = criteriaWeightingConfig?.payload;
  if (!isPlainObject(payload)) {
    return "BWM mode requires payload data.";
  }

  const criterionNames = leafCriteria.map((criterion) => criterion?.name).filter(Boolean);
  const criterionNameSet = new Set(criterionNames);

  const bestCriterion = typeof payload.bestCriterion === "string"
    ? payload.bestCriterion.trim()
    : "";
  const worstCriterion = typeof payload.worstCriterion === "string"
    ? payload.worstCriterion.trim()
    : "";

  if (!bestCriterion || !criterionNameSet.has(bestCriterion)) {
    return "BWM mode requires a valid best criterion.";
  }

  if (!worstCriterion || !criterionNameSet.has(worstCriterion)) {
    return "BWM mode requires a valid worst criterion.";
  }

  if (criterionNames.length > 1 && bestCriterion === worstCriterion) {
    return "Best and worst criterion must be different.";
  }

  const bestToOthers = payload.bestToOthers;
  const othersToWorst = payload.othersToWorst;
  if (!isPlainObject(bestToOthers) || !isPlainObject(othersToWorst)) {
    return "BWM mode requires best-to-others and others-to-worst values.";
  }

  for (const criterionName of criterionNames) {
    const bestValue = Number(bestToOthers[criterionName]);
    const worstValue = Number(othersToWorst[criterionName]);

    if (!Number.isFinite(bestValue) || bestValue < 1 || bestValue > 9) {
      return `BWM best-to-others for '${criterionName}' must be between 1 and 9.`;
    }

    if (!Number.isFinite(worstValue) || worstValue < 1 || worstValue > 9) {
      return `BWM others-to-worst for '${criterionName}' must be between 1 and 9.`;
    }
  }

  if (Number(bestToOthers[bestCriterion]) !== 1) {
    return "BWM requires best-to-others[bestCriterion] = 1.";
  }

  if (Number(othersToWorst[worstCriterion]) !== 1) {
    return "BWM requires others-to-worst[worstCriterion] = 1.";
  }

  return null;
};

const validateCreatorFuzzyConfig = ({
  criteriaWeightingConfig,
  leafCriteria,
  selectedModel,
}) => {
  const payload = criteriaWeightingConfig?.payload;
  const weightsByCriterion = payload?.weightsByCriterion;

  if (!isPlainObject(weightsByCriterion)) {
    return "Fuzzy criteria weights are required.";
  }

  const criterionNames = leafCriteria.map((criterion) => criterion?.name).filter(Boolean);
  const fuzzyValueCount = resolveFuzzyCriteriaWeightValueCount(selectedModel);

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
  const [consensusMaxPhases, setConsensusMaxPhases] = useState(
    storedData.consensusMaxPhases || 3
  );
  const [consensusThreshold, setConsensusThreshold] = useState(
    storedData.consensusThreshold || 0.7
  );
  const [paramValues, setParamValues] = useState(storedData.paramValues || {});
  const [defaultModelParams, setDefaultModelParams] = useState(true);
  const [hasAttemptedCreateIssue, setHasAttemptedCreateIssue] = useState(false);
  const [domainAssignments, setDomainAssignments] = useState(
    storedData.domainAssignments || {}
  );
  const [criteriaWeightingConfig, setCriteriaWeightingConfig] = useState(
    isPlainObject(storedData.criteriaWeightingConfig)
      ? storedData.criteriaWeightingConfig
      : buildDefaultCriteriaWeightingConfig(storedData.selectedModel || null)
  );
  const effectiveIsConsensus = selectedModel?.supportsConsensus === true;

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
      domainAssignments,
      paramValues,
      criteriaWeightingConfig,
      closureDate: closureDate ? closureDate.toJSON() : null,
      ...(effectiveIsConsensus && {
        consensusMaxPhases,
        consensusThreshold,
      }),
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
    domainAssignments,
    paramValues,
    criteriaWeightingConfig,
  ]);

  useEffect(() => {
    if (selectedModel && selectedModel.parameters) {
      try {
        setParamValues(
          setDefaults({
            selectedModel,
            criteria: getLeafCriteria(criteria),
          })
        );
      } catch {
        showSnackbarAlert("No se pudieron mostrar los parámetros del modelo.", "error");
        return;
      }
      setDefaultModelParams(true);
      setHasAttemptedCreateIssue(false);
    }
    setCriteriaWeightingConfig(
      buildDefaultCriteriaWeightingConfig(selectedModel)
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  useEffect(() => {
    if (addedExperts.length > 0 && alternatives.length > 0 && criteria.length > 0) {
      setDomainAssignments((previous) =>
        buildInitialAssignments(
          addedExperts,
          alternatives,
          getLeafCriteria(criteria),
          previous,
          selectedModel,
          globalDomains,
          expressionDomains
        )
      );
    }
  }, [
    addedExperts,
    alternatives,
    criteria,
    selectedModel,
    globalDomains,
    expressionDomains,
  ]);

  useEffect(() => {
    setParamValues((previous) =>
      updateParamValues(previous, selectedModel, getLeafCriteria(criteria))
    );
  }, [criteria, selectedModel]);

  useEffect(() => {
    if (!selectedModel?.parameters) {
      if (defaultModelParams !== true) setDefaultModelParams(true);
      return;
    }

    const leafCriteria = getLeafCriteria(criteria);
    let defaults = {};
    try {
      defaults = setDefaults({
        selectedModel,
        criteria: leafCriteria,
      });
    } catch {
      return;
    }

    const parameterKeys = (selectedModel.parameters || [])
      .map((parameter) => parameter?.key)
      .filter(Boolean);

    const isOnDefault = parameterKeys.every((key) =>
      isDeepEqual(paramValues?.[key], defaults?.[key])
    );

    if (isOnDefault !== defaultModelParams) {
      setDefaultModelParams(isOnDefault);
    }
  }, [criteria, defaultModelParams, paramValues, selectedModel]);

  useEffect(() => {
    if (hasAttemptedCreateIssue) {
      setHasAttemptedCreateIssue(false);
    }
  }, [hasAttemptedCreateIssue, paramValues]);

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
      domainAssignments,
      criteriaWeightingConfig,
      paramValues,
      ...(effectiveIsConsensus && { consensusMaxPhases, consensusThreshold }),
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
    domainAssignments,
    criteriaWeightingConfig,
    paramValues,
    consensusMaxPhases,
    consensusThreshold,
  ]);

  /**
   * Ejecuta la creación final del issue si todas las validaciones pasan.
   *
   * @returns {Promise<void>}
   */
  const handleComplete = async () => {
    setHasAttemptedCreateIssue(true);
    handleClosureDateError();

    if (closureDateError) return;
    if (issueNameError) return;

    validateIssueName(issueName, setIssueNameError);
    validateIssueDescription(issueDescription, setIssueDescriptionError);

    if (!issueName || !issueDescription || issueNameError || issueDescriptionError) {
      return;
    }

    const modelRequiresConsensus = selectedModel?.supportsConsensus === true;

    if (!validateDomainAssigments(domainAssignments)) {
      showSnackbarAlert(
        "You must assign an expression domain to all criteria before creating the issue.",
        "error"
      );
      return;
    }

    const leafCriteria = getLeafCriteria(criteria);
    if (!criteriaWeightingConfig || typeof criteriaWeightingConfig !== "object") {
      showSnackbarAlert("Criteria weighting configuration is required.", "error");
      return;
    }

    if (criteriaWeightingConfig.mode === CRITERIA_WEIGHTING_MODES.EXPERT_BWM_CMCC) {
      showSnackbarAlert(
        "Simulated consensus for BWM will be available later.",
        "error"
      );
      return;
    }

    if (criteriaWeightingConfig.mode === CRITERIA_WEIGHTING_MODES.CREATOR_FUZZY) {
      const fuzzyValidationError = validateCreatorFuzzyConfig({
        criteriaWeightingConfig,
        leafCriteria,
        selectedModel,
      });
      if (fuzzyValidationError) {
        showSnackbarAlert(fuzzyValidationError, "error");
        return;
      }
    }

    if (leafCriteria.length > 1) {
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

      if (criteriaWeightingConfig.mode === CRITERIA_WEIGHTING_MODES.CREATOR_BWM) {
        const bwmValidationError = validateCreatorBwmConfig({
          criteriaWeightingConfig,
          leafCriteria,
        });
        if (bwmValidationError) {
          showSnackbarAlert(bwmValidationError, "error");
          return;
        }
      }
    }

    setLoading(true);

    const modelParameters = Array.isArray(selectedModel?.parameters)
      ? selectedModel.parameters
      : [];
    const criteriaWeightParameterKeys = modelParameters
      .filter((parameter) => parameter?.semanticRole === "criteriaWeights")
      .map((parameter) => parameter?.key)
      .filter(Boolean);
    const issueInfoPayload = { ...allData };
    issueInfoPayload.isConsensus = modelRequiresConsensus;
    const sanitizedParamValues = Object.entries(issueInfoPayload.paramValues || {})
      .filter(
        ([key]) =>
          key !== "weights" && !criteriaWeightParameterKeys.includes(key)
      )
      .reduce((accumulator, [key, value]) => {
        accumulator[key] = value;
        return accumulator;
      }, {});
    issueInfoPayload.paramValues = sanitizedParamValues;

    const result = await createIssue({
      ...issueInfoPayload,
      selectedModelId: selectedModel?._id || null,
    });

    if (result.success) {
      setIssueCreated(result);
      setLoading(false);
      navigate("/dashboard");
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
    paramValues,
    defaultModelParams,
    hasAttemptedCreateIssue,
    domainAssignments,
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
    setParamValues,
    setDefaultModelParams,
    setHasAttemptedCreateIssue,
    setDomainAssignments,
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
