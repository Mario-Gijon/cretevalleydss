// Importa hooks de React
import { useEffect, useState } from "react";
// Importa componentes de Material UI
import { Stack, MobileStepper, Typography, Stepper, Step, StepLabel, StepButton, Button } from "@mui/material";
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import DoneIcon from '@mui/icons-material/Done';
import { ModelStep } from "./Steps/ModelStep/ModelStep";
import { AlternativesStep } from "./Steps/AlternativesStep/AlternativesStep";
import { CriteriaStep } from "./Steps/CriteriaStep/CriteriaStep"
import { ExpertsStep } from "./Steps/ExpertsStep/ExpertsStep";
import { ExpressionDomainStep } from "./Steps/ExpressionDomainStep/ExpressionDomainStep";
import { SummaryStep } from "./Steps/SummaryStep/SummaryStep";
import { createIssue } from "../../src/controllers/issueController";
import { ColorlibConnector, ColorlibStepIcon } from "../../src/components/StyledComponents/StepperLibConnector";
import { buildInitialAssignments, getLeafCriteria, steps, updateParamValues, validateDomainAssigments, validateIssueDescription, validateIssueName, /* validateModelParams */ } from "../../src/utils/createIssueUtils";
import { CircularLoading } from "../../src/components/LoadingProgress/CircularLoading";
import { useIssuesDataContext } from "../../src/context/issues/issues.context";
import { useNavigate } from "react-router-dom";
import { useSnackbarAlertContext } from "../../src/context/snackbarAlert/snackbarAlert.context";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';

const LOCAL_STORAGE_KEY = "prevCreateIssueData";

dayjs.extend(utc);

const CreateIssuePage = () => {

  const { loading, setLoading, setIssueCreated, globalDomains, expressionDomains } = useIssuesDataContext()
  const { showSnackbarAlert } = useSnackbarAlertContext()
  const navigate = useNavigate();

  const storedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};

  const [activeStep, setActiveStep] = useState(storedData.activeStep || 0);
  const [completed] = useState(storedData.completed || {});
  const [selectedModel, setSelectedModel] = useState(storedData.selectedModel || null);
  const [withConsensus, setWithConsensus] = useState(storedData.withConsensus || false);
  const [alternatives, setAlternatives] = useState(storedData.alternatives || []);
  const [criteria, setCriteria] = useState(storedData.criteria || []);
  const [addedExperts, setAddedExperts] = useState(storedData.addedExperts || []);
  const [issueName, setIssueName] = useState(storedData.issueName || "");
  const [issueDescription, setissueDescription] = useState(storedData.issueDescription || "");
  const [issueNameError, setIssueNameError] = useState("");
  const [issueDescriptionError, setIssueDescriptionError] = useState(false);
  const [closureDate, setClosureDate] = useState(null);
  const [closureDateError, setClosureDateError] = useState(false);
  const [consensusMaxPhases, setConsensusMaxPhases] = useState(storedData.consensusMaxPhases || 3);
  const [consensusThreshold, setConsensusThreshold] = useState(storedData.consensusThreshold || 0.7);
  const [paramValues, setParamValues] = useState(storedData.paramValues || {});
  const [defaultModelParams, setDefaultModelParams] = useState(true);
  const [domainAssignments, setDomainAssignments] = useState(storedData.domainAssignments || {});
  const [bwmData, setBwmData] = useState(storedData.bwmData || { best: "", worst: "", bestToOthers: {}, othersToWorst: {} });
  const [weightingMode, setWeightingMode] = useState(storedData.weightingMode || "manual");

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
  }, [activeStep, completed, selectedModel, withConsensus, alternatives, criteria, addedExperts, issueName, issueDescription, closureDate, consensusMaxPhases, consensusThreshold, domainAssignments, paramValues, bwmData, weightingMode]);

  useEffect(() => {
    if (selectedModel && selectedModel.parameters) {
      // 1️⃣ Asignar valores por defecto
      const defaults = selectedModel.parameters.reduce((acc, param) => {
        acc[param.name] = param.default;
        return acc;
      }, {});

      // 2️⃣ Ajustar los arrays que dependen del número de criterios
      selectedModel.parameters.forEach((param) => {
        const { name, type, restrictions } = param;

        if (type === "array" && restrictions?.length === "matchCriteria") {
          const length = allData?.criteria?.length || 1; // número de criterios
          const equalWeight = 1 / length;

          if (!Array.isArray(defaults[name]) || defaults[name].length !== length) {
            defaults[name] = Array(length).fill(equalWeight);
          }
        }
      });

      setParamValues(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  useEffect(() => {
    if (addedExperts.length > 0 && alternatives.length > 0 && criteria.length > 0)
      setDomainAssignments((prev) => buildInitialAssignments(addedExperts, alternatives, getLeafCriteria(criteria), prev, selectedModel, globalDomains, expressionDomains));
  }, [addedExperts, alternatives, criteria, setDomainAssignments, selectedModel, globalDomains, expressionDomains]);

  useEffect(() => {
    setParamValues((prev) => updateParamValues(prev, selectedModel, getLeafCriteria(criteria)));
  }, [criteria, selectedModel]);

  useEffect(() => {
    if (weightingMode !== "bwm") {
      setBwmData({ best: "", worst: "", bestToOthers: {}, othersToWorst: {} });
    }
  }, [weightingMode]);

  const handleValidateIssueName = (newIssueName) => { validateIssueName(newIssueName, setIssueNameError); setIssueName(newIssueName) };

  const handleValidateIssueDescription = (newIssueDescription) => { validateIssueDescription(newIssueDescription, setIssueDescriptionError); setissueDescription(newIssueDescription) };

  const handleClosureDateError = (selectedDate) => {
    if (!selectedDate) {
      setClosureDateError(false)
      if (closureDate) handleClosureDateError(closureDate)
      return
    }

    const closureDateObj = dayjs(selectedDate);
    const today = dayjs().startOf("day");

    if (selectedDate) {
      if (closureDateObj.isBefore(today.add(2, "day"), "day")) {
        setClosureDateError(true)
        showSnackbarAlert("Closure date is not valid", "error");
        return;
      }
    }

    setClosureDateError(false)
  }

  const filteredParams = { ...paramValues };
  if (weightingMode !== "manual") delete filteredParams.weights;

  const allData = {
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

  // Manejar la creación del problema
  const handleComplete = async () => {
    handleClosureDateError();

    if (closureDateError) return;
    if (issueNameError) return;
    validateIssueName(issueName, setIssueNameError);
    validateIssueDescription(issueDescription, setIssueDescriptionError);
    if (!issueName || !issueDescription || issueNameError || issueDescriptionError) return;
    /* if (!validateModelParams(selectedModel, paramValues, criteria)) {
      showSnackbarAlert("There are invalid model parameters", "error");
      return;
    } */
    if (!validateDomainAssigments(domainAssignments)) {
      showSnackbarAlert("You must assign an expression domain to all criteria before creating the issue.", "error");
      return;
    }

    setLoading(true);

    const createdIssue = await createIssue(allData);

    if (createdIssue.success) {
      setIssueCreated(createdIssue);
      setLoading(false);
      navigate("/dashboard");
      return;
    }

    if (createdIssue.obj === "issueName") setIssueNameError(createdIssue.msg);
    showSnackbarAlert(createdIssue.msg, "error");
    setLoading(false);
  };

  if (loading) {
    // Mostrar un loader mientras los datos se están cargando
    return <CircularLoading color="secondary" size={50} height="30vh" />;
  }

  return (
    <>
      <Stack direction="column" spacing={{ xs: 2, sm: 2, md: 3 }} useFlexGap sx={{ mt: 1.5, justifyContent: "center", alignItems: "center", width: "100%" }}>
        <Stepper sx={{ display: { xs: "none", sm: "flex" }, width: "100%", flexGrow: 1 }} alternativeLabel activeStep={activeStep} connector={<ColorlibConnector />}>
          {steps.map((label, index) => (
            <Step key={label} completed={completed[index]} sx={{ cursor: "pointer" }} onClick={() => setActiveStep(index)}>
              <StepButton color="inherit" onClick={() => setActiveStep(index)}>
                <StepLabel slots={{ stepIcon: ColorlibStepIcon }}>{label}</StepLabel>
              </StepButton>
            </Step>
          ))}
        </Stepper>
        <Typography display={{ xs: "float", sm: "none" }} variant="h4">
          {steps[activeStep]}
        </Typography>
        <Stack flexGrow={1} gap={5} sx={{ alignItems: "center", justifyContent: "center" }}>
          <Stack flexGrow={1} sx={{ width: "100%" }}>
            {activeStep === 0 &&
              <ModelStep
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                withConsensus={withConsensus}
                setWithConsensus={setWithConsensus}
                criteria={criteria}
              />
            }
            {activeStep === 1 &&
              <AlternativesStep alternatives={alternatives} setAlternatives={setAlternatives} />
            }
            {activeStep === 2 &&
              <CriteriaStep criteria={criteria} setCriteria={setCriteria} isMultiCriteria={selectedModel.isMultiCriteria} />
            }
            {activeStep === 3 &&
              <ExpertsStep addedExperts={addedExperts} setAddedExperts={setAddedExperts} />
            }
            {activeStep === 4 &&
              <ExpressionDomainStep
                allData={allData}
                domainAssignments={domainAssignments}
                setDomainAssignments={setDomainAssignments}
              />
            }
            {activeStep === 5 &&
              <SummaryStep
                allData={allData}
                issueName={issueName}
                issueDescription={issueDescription}
                issueNameError={issueNameError}
                issueDescriptionError={issueDescriptionError}
                handleValidateIssueName={handleValidateIssueName}
                handleValidateIssueDescription={handleValidateIssueDescription}
                closureDate={closureDate}
                setClosureDate={setClosureDate}
                closureDateError={closureDateError}
                handleClosureDateError={handleClosureDateError}
                consensusMaxPhases={consensusMaxPhases}
                setConsensusMaxPhases={setConsensusMaxPhases}
                consensusThreshold={consensusThreshold}
                setConsensusThreshold={setConsensusThreshold}
                paramValues={paramValues}
                setParamValues={setParamValues}
                defaultModelParams={defaultModelParams}
                setDefaultModelParams={setDefaultModelParams}
                bwmData={bwmData}
                setBwmData={setBwmData}
                weightingMode={weightingMode}
                setWeightingMode={setWeightingMode}
              />
            }

          </Stack>

          <Stack direction="row" gap={{ xs: 1, sm: 4 }} sx={{ justifyContent: "center", alignItems: "flex-end" }}>
            <MobileStepper
              variant="dots"
              steps={steps.length}
              position="bottom"
              activeStep={activeStep}
              sx={{ display: { xs: "flex", sm: "none" }, flexGrow: 1, alignItems: "center", }}
              nextButton={activeStep !== steps.length - 1
                ? <Button color="success" variant="outlined" onClick={() => setActiveStep((prev) => prev + 1)} endIcon={<ArrowForwardIosIcon />}>Next</Button>
                : <Button color="success" variant="outlined" onClick={handleComplete} endIcon={<DoneIcon />}>Create</Button>
              }
              backButton={
                <Button color="info" variant="outlined" startIcon={<ArrowBackIosIcon />} disabled={activeStep === 0} onClick={() => setActiveStep((prev) => prev - 1)}> Back </Button>
              }
            />
            <Button sx={{ display: { xs: "none", sm: "flex" } }} color="info" variant="outlined" startIcon={activeStep !== 0 && <ArrowBackIosIcon />} disabled={activeStep === 0} onClick={() => setActiveStep((prev) => prev - 1)}> Back </Button>
            {activeStep !== steps.length - 1
              ? <Button sx={{ display: { xs: "none", sm: "flex" } }} color="success" variant="outlined" onClick={() => setActiveStep((prev) => prev + 1)} endIcon={<ArrowForwardIosIcon />}>Next</Button>
              : <Button sx={{ display: { xs: "none", sm: "flex" } }} color="success" variant="outlined" onClick={handleComplete} endIcon={<DoneIcon />}>Create</Button>
            }
          </Stack>
        </Stack>
      </Stack>
    </>
  );
};

export default CreateIssuePage