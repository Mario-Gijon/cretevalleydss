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
import { DomainExpressionStep } from "./Steps/DomainExpressionStep/DomainExpressionStep";
import { SummaryStep } from "./Steps/SummaryStep/SummaryStep";
import { createIssue } from "../../src/controllers/issueController";
import { ColorlibConnector, ColorlibStepIcon, DeactivateColorlibStepIcon } from "./customStyles/StepperLibConnector";
import { dataTypeOptions, generateDomainExpressions, steps, validateIssueDescription, validateIssueName, processGroupedData, hasUndefinedDataTypes } from "../../src/utils/createIssueUtils";
import dayjs from "dayjs";
import { CircularLoading } from "../../src/components/LoadingProgress/CircularLoading";
import { useIssuesDataContext } from "../../src/context/issues/issues.context";
import { useNavigate } from "react-router-dom";
import { useSnackbarAlertContext } from "../../src/context/snackbarAlert/snackbarAlert.context";

const LOCAL_STORAGE_KEY = "prevCreateIssueData";

const CreateIssuePage = () => {

  const { initialExperts, models, loading, setLoading, setIssueCreated } = useIssuesDataContext()

  const storedData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};

  const navigate = useNavigate();

  const { showSnackbarAlert } = useSnackbarAlertContext()

  const [activeStep, setActiveStep] = useState(storedData.activeStep || 0);
  const [completed] = useState(storedData.completed || {});
  const [selectedModel, setSelectedModel] = useState(storedData.selectedModel || null);
  const [withConsensus, setWithConsensus] = useState(storedData.withConsensus || false);
  const [alternatives, setAlternatives] = useState(storedData.alternatives || []);
  const [criteria, setCriteria] = useState(storedData.criteria || []);
  const [addedExperts, setAddedExperts] = useState(storedData.addedExperts || []);
  const [dataTypes, setDataTypes] = useState(storedData.dataTypes || {});
  const [issueName, setIssueName] = useState(storedData.issueName || "");
  const [issueDescription, setissueDescription] = useState(storedData.issueDescription || "");
  const [issueNameError, setIssueNameError] = useState("");
  const [issueDescriptionError, setIssueDescriptionError] = useState(false);
  const [closureDate, setClosureDate] = useState(storedData.closureDate ? dayjs(storedData.closureDate) : null);
  const [closureDateError, setClosureDateError] = useState(false);
  const [shouldClearStorage, setShouldClearStorage] = useState(false);
  const [consensusMaxPhases, setConsensusMaxPhases] = useState(storedData.consensusMaxPhases || 3);
  const [consensusThreshold, setConsensusThreshold] = useState(storedData.consensusThreshold || 0.7);

  useEffect(() => {
    if (shouldClearStorage) return; // Evitar que el efecto vuelva a escribir en localStorage

    const dataToSave = {
      activeStep,
      completed,
      selectedModel,
      withConsensus,
      alternatives,
      criteria,
      addedExperts,
      dataTypes,
      issueName,
      issueDescription,
      closureDate: closureDate ? closureDate.toJSON() : null,
      ...(withConsensus && {
        consensusMaxPhases,
        consensusThreshold,
      }),
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [activeStep, completed, selectedModel, withConsensus, alternatives, criteria, addedExperts, dataTypes, issueName, issueDescription, closureDate, shouldClearStorage, consensusMaxPhases, consensusThreshold]);

  // Funciones de navegación
  const handleNext = () => setActiveStep((prev) => Math.min(prev + 1, steps.length - 1) === 4 ? 5 : Math.min(prev + 1, steps.length - 1));
  const handleBack = () => setActiveStep((prev) => Math.max(prev - 1, 0) === 4 ? 3 : Math.max(prev - 1, 0));
  const handleStep = (step) => () => {
    if (step !== 4) {
      setActiveStep(step)
    } else {
      showSnackbarAlert("This step is disabled for now, please continue with the next steps.", "info");
    }
  }

  // Dentro de CreateIssuePage
  const handleValidateIssueName = (newIssueName) => { validateIssueName(newIssueName, setIssueNameError); setIssueName(newIssueName) };

  const handleValidateIssueDescription = (newIssueDescription) => { validateIssueDescription(newIssueDescription, setIssueDescriptionError); setissueDescription(newIssueDescription) };

  const domainExpressions = generateDomainExpressions({ dataTypes, alternatives, criteria, addedExperts });

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
        return;
      }
    }

    setClosureDateError(false)
  }

  const allData = {
    issueName,
    issueDescription,
    selectedModel,
    withConsensus,
    alternatives,
    criteria,
    addedExperts,
    domainExpressions,
    closureDate,
    ...(withConsensus && {
      consensusMaxPhases,
      consensusThreshold,
    }),
  };

  // Obtener groupedData ya procesado
  const groupedData = processGroupedData(criteria, domainExpressions);

  // Manejar la creación del problema
  const handleComplete = async () => {
    handleClosureDateError();

    if (issueNameError) return
    validateIssueName(issueName, setIssueNameError);
    validateIssueDescription(issueDescription, setIssueDescriptionError);

    if (!issueName || !issueDescription || issueNameError || issueDescriptionError) return;
    if (hasUndefinedDataTypes(groupedData)) {
      showSnackbarAlert("There are undefined domain expressions", "error");
      return;
    }

    setLoading(true); // Establece loading en true antes de la creación del problema

    const createdIssue = await createIssue(allData);

    setLoading(false); // Establece loading en false cuando la creación haya terminado

    if (createdIssue.success) {
      setShouldClearStorage(false);
      //localStorage.removeItem(LOCAL_STORAGE_KEY);
      console.log(createdIssue)
      setIssueCreated(createdIssue);
      navigate('/dashboard');
      return
    }
    if (createdIssue.obj === "issueName") setIssueNameError(createdIssue.msg);
    showSnackbarAlert(createdIssue.msg, "error");
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
            <Step key={label} completed={completed[index]} sx={{ cursor: "pointer" }} onClick={handleStep(index)}>
              <StepButton color="inherit" onClick={handleStep(index)}>
                <StepLabel slots={label === "Expression domain" ? { stepIcon: DeactivateColorlibStepIcon } : { stepIcon: ColorlibStepIcon }}>{label}</StepLabel>
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
                models={models}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                withConsensus={withConsensus}
                setWithConsensus={setWithConsensus}
              />
            }
            {activeStep === 1 &&
              <AlternativesStep alternatives={alternatives} setAlternatives={setAlternatives} />
            }
            {activeStep === 2 &&
              <CriteriaStep criteria={criteria} setCriteria={setCriteria} />
            }
            {activeStep === 3 &&
              <ExpertsStep initialExperts={initialExperts} addedExperts={addedExperts} setAddedExperts={setAddedExperts} />
            }
            {activeStep === 4 &&
              <DomainExpressionStep allData={allData} dataTypes={dataTypes} setDataTypes={setDataTypes} dataTypeOptions={dataTypeOptions} />
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
                groupedData={groupedData}
                consensusMaxPhases={consensusMaxPhases}
                setConsensusMaxPhases={setConsensusMaxPhases}
                consensusThreshold={consensusThreshold}
                setConsensusThreshold={setConsensusThreshold}
              />
            }
          </Stack>

          <Stack direction="row" gap={{ xs: 1, sm: 4 }} sx={{ justifyContent: "center", alignItems: "flex-end" }}>
            <MobileStepper
              variant="dots"
              steps={steps.length}
              position="bottom"
              activeStep={activeStep}
              sx={{
                display: { xs: "flex", sm: "none" },
                flexGrow: 1,
                alignItems: "center",
              }}
              nextButton={activeStep !== steps.length - 1
                ? <Button color="success" variant="outlined" onClick={handleNext} endIcon={<ArrowForwardIosIcon />}>Next</Button>
                : <Button color="success" variant="outlined" onClick={handleComplete} endIcon={<DoneIcon />}>Create</Button>
              }
              backButton={
                <Button color="info" variant="outlined" startIcon={<ArrowBackIosIcon />} disabled={activeStep === 0} onClick={handleBack}> Back </Button>
              }
            />
            <Button sx={{ display: { xs: "none", sm: "flex" } }} color="info" variant="outlined" startIcon={activeStep !== 0 && <ArrowBackIosIcon />} disabled={activeStep === 0} onClick={handleBack}> Back </Button>
            {activeStep !== steps.length - 1
              ? <Button sx={{ display: { xs: "none", sm: "flex" } }} color="success" variant="outlined" onClick={handleNext} endIcon={<ArrowForwardIosIcon />}>Next</Button>
              : <Button sx={{ display: { xs: "none", sm: "flex" } }} color="success" variant="outlined" onClick={handleComplete} endIcon={<DoneIcon />}>Create</Button>
            }
          </Stack>
        </Stack>
      </Stack>
    </>
  );
};

export default CreateIssuePage