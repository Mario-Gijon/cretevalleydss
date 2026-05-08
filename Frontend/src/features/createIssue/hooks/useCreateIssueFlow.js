import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { createIssue } from "../../../services/issue.service";
import {
  getParameterExpectedLength,
  validateCriteriaWeightsParameterValue
} from "../../modelParameters";
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
import { useIssuesDataContext } from "../../../context/issues/issues.context";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";

const LOCAL_STORAGE_KEY = "prevCreateIssueData";

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
  const [withConsensus, setWithConsensus] = useState(storedData.withConsensus || false);
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
  const [bwmData, setBwmData] = useState(
    storedData.bwmData || {
      best: "",
      worst: "",
      bestToOthers: {},
      othersToWorst: {},
    }
  );
  const [weightingMode, setWeightingMode] = useState(
    storedData.weightingMode || "manual"
  );

  useEffect(() => {
    const dataToSave = {
      activeStep,
      completed,
      selectedModel,
      withConsensus,
      alternatives,
      criteria,
      addedExperts,
      issueName,
      issueDescription,
      domainAssignments,
      paramValues,
      bwmData,
      weightingMode,
      closureDate: closureDate ? closureDate.toJSON() : null,
      ...(withConsensus && {
        consensusMaxPhases,
        consensusThreshold,
      }),
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [
    activeStep,
    completed,
    selectedModel,
    withConsensus,
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
    bwmData,
    weightingMode,
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
    if (weightingMode !== "bwm") {
      setBwmData({ best: "", worst: "", bestToOthers: {}, othersToWorst: {} });
    }
  }, [weightingMode]);

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
    const leafCount = getLeafCriteria(criteria).length;
    const isSingleLeaf = leafCount === 1;

    const filteredParams = { ...paramValues };
    if (!isSingleLeaf && weightingMode !== "manual") {
      delete filteredParams.weights;
    }

    return {
      issueName,
      issueDescription,
      selectedModel,
      withConsensus,
      alternatives,
      criteria,
      addedExperts,
      closureDate: closureDate ? dayjs(closureDate).startOf("day").toDate() : null,
      domainAssignments,
      weightingMode,
      paramValues: filteredParams,
      ...(weightingMode === "bwm" && { bwmData }),
      ...(withConsensus && { consensusMaxPhases, consensusThreshold }),
    };
  }, [
    issueName,
    issueDescription,
    selectedModel,
    withConsensus,
    alternatives,
    criteria,
    addedExperts,
    closureDate,
    domainAssignments,
    weightingMode,
    paramValues,
    bwmData,
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

    if (!validateDomainAssigments(domainAssignments)) {
      showSnackbarAlert(
        "You must assign an expression domain to all criteria before creating the issue.",
        "error"
      );
      return;
    }

    const leafCriteria = getLeafCriteria(criteria);
    const criteriaWeightsParameter = (selectedModel?.parameters || []).find(
      (parameter) => parameter?.ui?.component === "criteriaWeights"
    );

    if (criteriaWeightsParameter) {
      const paramKey = criteriaWeightsParameter?.key;
      const weightsValue = allData?.paramValues?.[paramKey];
      const expectedLength = getParameterExpectedLength(
        criteriaWeightsParameter,
        leafCriteria.length
      );

      if (weightsValue !== undefined && expectedLength !== null) {
        const validation = validateCriteriaWeightsParameterValue({
          parameter: criteriaWeightsParameter,
          value: weightsValue,
          leafCount: leafCriteria.length,
        });

        if (!validation.isValid) {
          showSnackbarAlert(validation.message, "error");
          return;
        }
      }
    }

    setLoading(true);

    const {  ...issueInfoPayload } = allData;
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
    withConsensus,
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
    bwmData,
    weightingMode,
    allData,
    headerSubtitle,
    setSelectedModel,
    setWithConsensus,
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
    setBwmData,
    setWeightingMode,
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
