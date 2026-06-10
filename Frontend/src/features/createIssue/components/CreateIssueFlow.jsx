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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import DoneIcon from "@mui/icons-material/Done";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import { ModelStep } from "../steps/ModelStep";
import { AlternativesStep } from "../steps/AlternativesStep";
import { CriteriaStep } from "../steps/CriteriaStep";
import { ExpertsStep } from "../steps/ExpertsStep";
import { ExpressionDomainStep } from "../steps/ExpressionDomainStep";
import { SummaryStep } from "../steps/SummaryStep";

import { ColorlibConnector, ColorlibStepIcon } from "./StepperLibConnector";
import { CircularLoading } from "../../../components/LoadingProgress/CircularLoading";
import { GlassPaper } from "../../../components/StyledComponents/GlassPaper";
import { CreateIssueProvider } from "../context/createIssue.provider";
import { useCreateIssueContext } from "../context/createIssue.context";
import { CREATE_ISSUE_STEPS as steps } from "../logic/createIssueSummary";
import {
  contentSx,
  getCreateIssueFooterSx,
  getCreateIssueHeaderSx,
  getCreateIssueMobileStepperSx,
  getCreateIssueShellSx,
  getCreateIssueSoftIconSx,
  getCreateIssueStepperWrapSx,
} from "../styles/createIssue.styles";

/**
 * Contenido visual del flujo createIssue.
 *
 * @returns {JSX.Element}
 */
const CreateIssueFlowContent = () => {
  const theme = useTheme();

  const {
    loading,
    activeStep,
    completed,
    headerSubtitle,
    handleComplete,
    goToStep,
    goNextStep,
    goPrevStep,
  } = useCreateIssueContext();

  if (loading) {
    return <CircularLoading color="secondary" size={50} height="30vh" />;
  }

  return (
    <Stack
      sx={{ width: "100%", px: { xs: 1.2, sm: 2.2 }, mt: 1.5 }}
      justifyContent="center"
      alignItems="center"
    >
      <GlassPaper variant="elevation" elevation={0} sx={getCreateIssueShellSx(theme)}>
        <Box sx={getCreateIssueHeaderSx(theme)}>
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.15} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar sx={getCreateIssueSoftIconSx(theme)}>
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

            <Typography
              sx={{ display: { xs: "block", sm: "none" }, fontWeight: 900, color: "text.secondary" }}
              variant="caption"
            >
              {steps[activeStep]}
            </Typography>
          </Stack>
        </Box>

        <Box sx={getCreateIssueStepperWrapSx(theme)}>
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
                onClick={() => goToStep(index)}
              >
                <StepButton color="inherit" onClick={() => goToStep(index)}>
                  <StepLabel slots={{ stepIcon: ColorlibStepIcon }}>{label}</StepLabel>
                </StepButton>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={contentSx}>
          <Stack sx={{ width: "100%", minHeight: 0, mt: 2 }}>
            {activeStep === 0 && <ModelStep />}
            {activeStep === 1 && <AlternativesStep />}
            {activeStep === 2 && <CriteriaStep />}
            {activeStep === 3 && <ExpertsStep />}
            {activeStep === 4 && <ExpressionDomainStep />}
            {activeStep === 5 && <SummaryStep />}
          </Stack>
        </Box>

        <Box sx={{mt:0, pt:0, ...getCreateIssueFooterSx()}}>
          <Stack direction="row" gap={{ xs: 1, sm: 4 }} sx={{ justifyContent: "center", alignItems: "center" }}>
            <MobileStepper
              variant="dots"
              steps={steps.length}
              position="static"
              activeStep={activeStep}
              sx={getCreateIssueMobileStepperSx(theme)}
              nextButton={
                activeStep !== steps.length - 1 ? (
                  <Button
                    color="success"
                    variant="outlined"
                    onClick={goNextStep}
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
                  onClick={goPrevStep}
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
              onClick={goPrevStep}
            >
              Back
            </Button>

            {activeStep !== steps.length - 1 ? (
              <Button
                sx={{ display: { xs: "none", sm: "flex" } }}
                color="success"
                variant="outlined"
                onClick={goNextStep}
                endIcon={<ArrowForwardIosIcon />}
              >
                Next
              </Button>
            ) : (
              <Button
                sx={{ display: { xs: "none", sm: "flex" } }}
                color="success"
                variant="outlined"
                onClick={handleComplete}
                endIcon={<DoneIcon />}
              >
                Create
              </Button>
            )}
          </Stack>
        </Box>
      </GlassPaper>
    </Stack>
  );
};

/**
 * Entrada del feature createIssue.
 *
 * Envuelve el flujo con su provider local de contexto.
 *
 * @returns {JSX.Element}
 */
const CreateIssueFlow = () => {
  return (
    <CreateIssueProvider>
      <CreateIssueFlowContent />
    </CreateIssueProvider>
  );
};

export default CreateIssueFlow;
