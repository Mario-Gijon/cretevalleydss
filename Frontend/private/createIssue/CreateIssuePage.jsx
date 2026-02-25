// Importa hooks de React
import { useEffect, useState, useMemo } from "react";
// Importa componentes de Material UI
import {
  Stack,
  MobileStepper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Button,
  Box,
  Avatar,
  Divider,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DoneIcon from "@mui/icons-material/Done";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import { ModelStep } from "./Steps/ModelStep/ModelStep";
import { AlternativesStep } from "./Steps/AlternativesStep/AlternativesStep";
import { CriteriaStep } from "./Steps/CriteriaStep/CriteriaStep";
import { ExpertsStep } from "./Steps/ExpertsStep/ExpertsStep";
import { ExpressionDomainStep } from "./Steps/ExpressionDomainStep/ExpressionDomainStep";
import { SummaryStep } from "./Steps/SummaryStep/SummaryStep";

import { createIssue } from "../../src/controllers/issueController";
import { ColorlibConnector, ColorlibStepIcon } from "../../src/components/StyledComponents/StepperLibConnector";
import {
  buildInitialAssignments,
  getLeafCriteria,
  steps,
  updateParamValues,
  validateDomainAssigments,
  validateIssueDescription,
  validateIssueName,
  /* validateModelParams */
} from "../../src/utils/createIssueUtils";
import { CircularLoading } from "../../src/components/LoadingProgress/CircularLoading";
import { useIssuesDataContext } from "../../src/context/issues/issues.context";
import { useNavigate } from "react-router-dom";
import { useSnackbarAlertContext } from "../../src/context/snackbarAlert/snackbarAlert.context";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

// ✅ si ya lo tienes en el proyecto, úsalo (igual que en otros sitios)
import { GlassPaper } from "../../src/components/StyledComponents/GlassPaper";

const LOCAL_STORAGE_KEY = "prevCreateIssueData";
dayjs.extend(utc);

const auroraBg = (theme, intensity = 0.16) => ({
  backgroundImage: `radial-gradient(1100px 520px at 12% 0%, ${alpha(
    theme.palette.info.main,
    intensity
  )}, transparent 62%)`,
});

const softIconSx = (theme) => ({
  width: 44,
  height: 44,
  bgcolor: alpha(theme.palette.info.main, 0.12),
  color: "info.main",
  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
});

const shellSx = (theme) => ({
  width: "100%",
  maxWidth: 1300,
  borderRadius: 5,
  overflow: "hidden",
  position: "relative",

  // ✅ “atmósfera” global para TODA la página de creación
  backgroundColor: alpha(theme.palette.background.paper, 0.10),
  ...auroraBg(theme, 0.12),
  backdropFilter: "blur(16px)",

  border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  boxShadow: `0 18px 60px ${alpha(theme.palette.common.black, 0.12)}`,

  // ✅ highlight superior suave (mantiene tu look sin cajas extra)
  "&:after": {
    content: '""',
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.10)}, transparent 46%)`,
    opacity: 0.18,
    zIndex: 0,
  },

  // ✅ todo el contenido por encima del overlay
  "& > *": { position: "relative", zIndex: 1 },
});

const headerSx = (theme) => ({
  // ✅ como el shell ya tiene aurora, bajamos un poco la intensidad para que no “doble”
  ...auroraBg(theme, 0.10),
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
  px: { xs: 1.8, sm: 2.2 },
  py: { xs: 1.6, sm: 1.9 },
});

const stepperWrapSx = (theme) => ({
  px: { xs: 1.2, sm: 2.0 },
  py: { xs: 1.2, sm: 1.4 },
  borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
  bgcolor: alpha(theme.palette.common.white, 0.015),
});

const contentSx = {
  px: { xs: 0.5, sm: 1.2, md: 1.8 },
  py: { xs: 0.6, sm: 1.0, md: 1.6 },
};

const footerSx = (theme) => ({
  px: { xs: 1.5, sm: 2.2 },
  py: 1.6,
  pt:5,
});

const CreateIssuePage = () => {
  const theme = useTheme();

  const { loading, setLoading, setIssueCreated, globalDomains, expressionDomains } = useIssuesDataContext();
  const { showSnackbarAlert } = useSnackbarAlertContext();
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
      const defaults = selectedModel.parameters.reduce((acc, param) => {
        acc[param.name] = param.default;
        return acc;
      }, {});

      selectedModel.parameters.forEach((param) => {
        const { name, type, restrictions } = param;

        if (type === "array" && restrictions?.length === "matchCriteria") {
          const length = getLeafCriteria(criteria).length || 1;
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
      setDomainAssignments((prev) =>
        buildInitialAssignments(
          addedExperts,
          alternatives,
          getLeafCriteria(criteria),
          prev,
          selectedModel,
          globalDomains,
          expressionDomains
        )
      );
  }, [addedExperts, alternatives, criteria, setDomainAssignments, selectedModel, globalDomains, expressionDomains]);

  useEffect(() => {
    setParamValues((prev) => updateParamValues(prev, selectedModel, getLeafCriteria(criteria)));
  }, [criteria, selectedModel]);

  useEffect(() => {
    if (weightingMode !== "bwm") {
      setBwmData({ best: "", worst: "", bestToOthers: {}, othersToWorst: {} });
    }
  }, [weightingMode]);

  const handleValidateIssueName = (newIssueName) => {
    validateIssueName(newIssueName, setIssueNameError);
    setIssueName(newIssueName);
  };

  const handleValidateIssueDescription = (newIssueDescription) => {
    validateIssueDescription(newIssueDescription, setIssueDescriptionError);
    setissueDescription(newIssueDescription);
  };

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

  const leafCount = getLeafCriteria(criteria).length;
  const isSingleLeaf = leafCount === 1;

  const filteredParams = { ...paramValues };

  if (!isSingleLeaf && weightingMode !== "manual") {
    delete filteredParams.weights;
  }

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

  const handleComplete = async () => {
    handleClosureDateError();

    if (closureDateError) return;
    if (issueNameError) return;
    validateIssueName(issueName, setIssueNameError);
    validateIssueDescription(issueDescription, setIssueDescriptionError);
    if (!issueName || !issueDescription || issueNameError || issueDescriptionError) return;

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

  // ✅ Solo UI: para el subtitle y el iconito del header
  const headerSubtitle = useMemo(() => {
    const label = steps?.[activeStep] ?? "";
    const total = steps?.length ?? 0;
    return `${label} • Step ${activeStep + 1}/${total}`;
  }, [activeStep]);

  if (loading) {
    return <CircularLoading color="secondary" size={50} height="30vh" />;
  }

  return (
    <Stack sx={{ width: "100%", px: { xs: 1.2, sm: 2.2 }, mt: 1.5 }} justifyContent={"center"} alignItems={"center"}>
      <GlassPaper variant="elevation" elevation={0} sx={shellSx(theme)}>
        {/* Header bonito */}
        <Box sx={headerSx(theme)}>
          <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1.15} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar sx={softIconSx(theme)}>
                <AutoAwesomeIcon />
              </Avatar>

              <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 980, lineHeight: 1.1 }}>
                  Create issue
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 900 }}>
                  {headerSubtitle}
                </Typography>
              </Stack>
            </Stack>

            {/* Título mobile solo */}
            <Typography
              sx={{ display: { xs: "block", sm: "none" }, fontWeight: 900, color: "text.secondary" }}
              variant="caption"
            >
              {steps[activeStep]}
            </Typography>
          </Stack>
        </Box>

        {/* Stepper (desktop) */}
        <Box sx={stepperWrapSx(theme)}>
          <Stepper
            sx={{ display: { xs: "none", sm: "flex" }, width: "100%" }}
            alternativeLabel
            activeStep={activeStep}
            connector={<ColorlibConnector />}
          >
            {steps.map((label, index) => (
              <Step
                key={label}
                completed={completed[index]}
                sx={{ cursor: "pointer" }}
                // ✅ No cambies esto: click en Step funciona hacia delante y hacia atrás
                onClick={() => setActiveStep(index)}
              >
                <StepButton
                  color="inherit"
                  // ✅ No cambies esto: click en StepButton también
                  onClick={() => setActiveStep(index)}
                >
                  <StepLabel slots={{ stepIcon: ColorlibStepIcon }}>{label}</StepLabel>
                </StepButton>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Contenido del step */}
        <Box sx={contentSx}>
          {/* Importante: no tocamos lógica. Solo wrapper. */}
          <Stack sx={{ width: "100%", minHeight: 0, mt:2 }}>
            {activeStep === 0 && (
              <ModelStep
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                withConsensus={withConsensus}
                setWithConsensus={setWithConsensus}
                criteria={criteria}
              />
            )}

            {activeStep === 1 && <AlternativesStep alternatives={alternatives} setAlternatives={setAlternatives} />}

            {activeStep === 2 && (
              <CriteriaStep criteria={criteria} setCriteria={setCriteria} isMultiCriteria={selectedModel?.isMultiCriteria} />
            )}

            {activeStep === 3 && <ExpertsStep addedExperts={addedExperts} setAddedExperts={setAddedExperts} />}

            {activeStep === 4 && (
              <ExpressionDomainStep
                allData={allData}
                domainAssignments={domainAssignments}
                setDomainAssignments={setDomainAssignments}
              />
            )}

            {activeStep === 5 && (
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
            )}
          </Stack>
        </Box>

        {/* Footer navegación (misma lógica, mejor look) */}
        <Box sx={footerSx(theme)}>
          <Stack direction="row" gap={{ xs: 1, sm: 4 }} sx={{ justifyContent: "center", alignItems: "center" }}>
            <MobileStepper
              variant="dots"
              steps={steps.length}
              position="static"
              activeStep={activeStep}
              sx={{
                display: { xs: "flex", sm: "none" },
                flexGrow: 1,
                bgcolor: "transparent",
                alignItems: "center",
                "& .MuiMobileStepper-dots": { mx: 1 },
                "& .MuiMobileStepper-dot": { bgcolor: alpha(theme.palette.common.white, 0.25) },
                "& .MuiMobileStepper-dotActive": { bgcolor: alpha(theme.palette.info.main, 0.75) },
              }}
              nextButton={
                activeStep !== steps.length - 1 ? (
                  <Button
                    color="success"
                    variant="outlined"
                    onClick={() => setActiveStep((prev) => prev + 1)}
                    endIcon={<ArrowForwardIosIcon />}
                  >
                    Next
                  </Button>
                ) : (
                  <Button color="success" variant="outlined" onClick={handleComplete} endIcon={<DoneIcon />}>
                    Create
                  </Button>
                )
              }
              backButton={
                <Button
                  color="info"
                  variant="outlined"
                  startIcon={<ArrowBackIosIcon />}
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((prev) => prev - 1)}
                >
                  Back
                </Button>
              }
            />

            <Button
              sx={{ display: { xs: "none", sm: "flex" } }}
              color="info"
              variant="outlined"
              startIcon={activeStep !== 0 && <ArrowBackIosIcon />}
              disabled={activeStep === 0}
              onClick={() => setActiveStep((prev) => prev - 1)}
            >
              Back
            </Button>

            {activeStep !== steps.length - 1 ? (
              <Button
                sx={{ display: { xs: "none", sm: "flex" } }}
                color="success"
                variant="outlined"
                onClick={() => setActiveStep((prev) => prev + 1)}
                endIcon={<ArrowForwardIosIcon />}
              >
                Next
              </Button>
            ) : (
              <Button sx={{ display: { xs: "none", sm: "flex" } }} color="success" variant="outlined" onClick={handleComplete} endIcon={<DoneIcon />}>
                Create
              </Button>
            )}
          </Stack>
        </Box>
      </GlassPaper>
    </Stack>
  );
};

export default CreateIssuePage;
