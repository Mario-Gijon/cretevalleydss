import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { createIssue } from "../../../services/issue.service";
import {
  getCreateIssueModelParameters,
} from "../../modelParameters";
import { getLeafCriteria } from "../../../utils/criteria.utils";
import {
  buildInitialExpressionDomainConfig,
} from "../../../utils/domainAssignments.utils";
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";
import {
  validateIssueDescription,
  validateIssueName,
} from "../logic/createIssueFieldValidation";
import {
  setDefaults,
  updateParamValues,
} from "../logic/createIssueModelParameters";
import {
  buildStoredCreateIssueData,
  persistStoredCreateIssueData,
  readStoredCreateIssueData,
  resolveInitialConsensusMaxPhases,
  resolveInitialConsensusThreshold,
  resolveInitialCriteriaWeightingConfig,
  resolveInitialExpressionDomainConfig,
} from "../logic/createIssueDraftState";
import {
  isCreateIssueCriteriaWeightingConfigOnDefault,
  isCreateIssueDeepEqual,
  buildDefaultCriteriaWeightingConfig,
  resolveAssignedFuzzyValueCount,
} from "../logic/createIssueCriteriaWeighting";
import { buildCreateIssueRequestPayload } from "../logic/createIssuePayload";
import {
  buildCreateIssueAllData,
  buildCreateIssueHeaderSubtitle,
} from "../logic/createIssueSummary";
import {
  buildEqualExpertWeights,
  validateCreateIssueExpertWeights,
} from "../logic/createIssueExpertWeights";

const LOCAL_STORAGE_KEY = "prevCreateIssueData";

dayjs.extend(utc);

/**
 * Gestiona el estado y reglas del flujo createIssue.
 *
 * Mantiene fuera del componente de presentación toda la lógica de
 * persistencia local, validaciones, efectos derivados y creación final.
 *
 * @returns {Object}
 */
export const useCreateIssue = () => {
  const {
    loading,
    setLoading,
    setIssueCreated,
    globalDomains,
    expressionDomains,
    initialExperts,
  } = useIssuesDataContext();
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
    resolveInitialConsensusMaxPhases(storedData)
  );
  const [consensusThreshold, setConsensusThreshold] = useState(
    resolveInitialConsensusThreshold(storedData)
  );
  const [simulateConsensus, setSimulateConsensus] = useState(
    storedData.simulateConsensus === true
  );
  const [paramValues, setParamValues] = useState(storedData.paramValues || {});
  const [defaultModelParams, setDefaultModelParams] = useState(true);
  const [expressionDomainConfig, setExpressionDomainConfig] = useState(
    resolveInitialExpressionDomainConfig(storedData)
  );
  const [criteriaWeightingConfig, setCriteriaWeightingConfig] = useState(
    resolveInitialCriteriaWeightingConfig({
      storedData,
      fallbackConfig: buildDefaultCriteriaWeightingConfig(
        storedData.selectedModel || null
      ),
    })
  );
  const effectiveIsConsensus = selectedModel?.supportsConsensus === true;
  const modelSupportsConsensusSimulation =
    selectedModel?.supportsConsensusSimulation === true;
  const selectedExperts = useMemo(() => {
    const expertsByEmail = new Map(
      (Array.isArray(initialExperts) ? initialExperts : []).map((expert) => [
        String(expert?.email || "").trim().toLowerCase(),
        expert,
      ])
    );

    return (Array.isArray(addedExperts) ? addedExperts : [])
      .map((email) => expertsByEmail.get(String(email || "").trim().toLowerCase()))
      .filter(Boolean)
      .map((expert) => ({
        id: expert?._id || expert?.id || null,
        name: expert?.name || "",
        email: expert?.email || "",
        university: expert?.university || "",
      }));
  }, [addedExperts, initialExperts]);

  useEffect(() => {
    const dataToSave = buildStoredCreateIssueData({
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
      expressionDomainConfig,
      paramValues,
      criteriaWeightingConfig,
      closureDate,
      consensusMaxPhases,
      consensusThreshold,
      simulateConsensus,
    });

    persistStoredCreateIssueData(LOCAL_STORAGE_KEY, dataToSave);
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
    if (selectedModel?.usesExpertWeights !== true) {
      setParamValues((previous) => {
        if (!previous || previous.expertWeights === undefined) {
          return previous;
        }

        const next = { ...previous };
        delete next.expertWeights;
        return next;
      });
      return;
    }

    const selectedExpertIds = selectedExperts
      .map((expert) => String(expert?.id || "").trim())
      .filter(Boolean);
    const nextExpertWeights = buildEqualExpertWeights(selectedExpertIds);

    setParamValues((previous) => {
      const previousWeights = previous?.expertWeights || {};

      if (isCreateIssueDeepEqual(previousWeights, nextExpertWeights)) {
        return previous;
      }

      return {
        ...(previous || {}),
        expertWeights: nextExpertWeights,
      };
    });
  }, [selectedExperts, selectedModel?.usesExpertWeights, setParamValues]);

  const expertWeightsValidationMessage = useMemo(
    () =>
      validateCreateIssueExpertWeights({
        selectedModel,
        selectedExperts,
        expertWeights: paramValues?.expertWeights,
      }),
    [paramValues?.expertWeights, selectedExperts, selectedModel]
  );

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
      isCreateIssueDeepEqual(paramValues?.[key], defaults?.[key])
    );
    const isCriteriaWeightingOnDefault =
      isCreateIssueCriteriaWeightingConfigOnDefault({
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
    return buildCreateIssueAllData({
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
    });
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

    const requestPayload = buildCreateIssueRequestPayload({
      allData,
      selectedModel,
      selectedExperts,
      modelSupportsConsensusSimulation,
      simulateConsensus,
      consensusMaxPhases,
      consensusThreshold,
      criteria,
      globalDomains,
      expressionDomains,
      expressionDomainConfig,
      criteriaWeightingConfig,
      paramValues,
    });

    if (!requestPayload.ok) {
      showSnackbarAlert(requestPayload.errorMessage, "error");
      return;
    }

    setLoading(true);

    const result = await createIssue(requestPayload.payload);

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
    if (
      activeStep === 3 &&
      selectedModel?.usesExpertWeights === true &&
      expertWeightsValidationMessage
    ) {
      return;
    }

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
    return buildCreateIssueHeaderSubtitle(activeStep);
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
    selectedExperts,
    expertWeightsValidationMessage,
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

export default useCreateIssue;
