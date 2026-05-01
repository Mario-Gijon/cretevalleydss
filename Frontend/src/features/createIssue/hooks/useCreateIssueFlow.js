import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { createIssue } from "../../../services/issue.service";
import {
  readStoredCreateIssueData,
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
      const defaults = selectedModel.parameters.reduce((accumulator, parameter) => {
        const paramKey = parameter?.key || parameter?.name;
        if (!paramKey) return accumulator;
        accumulator[paramKey] = parameter.default;
        return accumulator;
      }, {});

      selectedModel.parameters.forEach((parameter) => {
        const { type, restrictions } = parameter;
        const paramKey = parameter?.key || parameter?.name;
        if (!paramKey) return;

        if (type === "array" && restrictions?.length === "matchCriteria") {
          const length = getLeafCriteria(criteria).length || 1;
          const equalWeight = 1 / length;

          if (!Array.isArray(defaults[paramKey]) || defaults[paramKey].length !== length) {
            defaults[paramKey] = Array(length).fill(equalWeight);
          }
        }
      });

      setParamValues(defaults);
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
    if (weightingMode !== "bwm") {
      setBwmData({ best: "", worst: "", bestToOthers: {}, othersToWorst: {} });
    }
  }, [weightingMode]);

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

    setLoading(true);

    const { selectedModel: _selectedModel, ...issueInfoPayload } = allData;
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
