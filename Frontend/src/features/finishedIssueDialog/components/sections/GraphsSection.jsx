import { Box, Button, MobileStepper, Stack } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import AnalyticsIcon from "@mui/icons-material/Analytics";

import { SectionCard } from "../shared/FinishedIssueDialogPrimitives";
import { AnalyticalScatterChart } from "../charts/AnalyticalScatterChart";
import { AnalyticalConsensusLineChart } from "../charts/AnalyticalConsensusLineChart";
import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";

/**
 * Seccion Graphs del dialogo de issue finalizado.
 *
 * @returns {JSX.Element|null}
 */
const GraphsSection = () => {
  const theme = useTheme();

  const { graphsSection } = useFinishedIssueDialogContext();

  const {
    viewIssue,
    activeStep,
    handleNext,
    handleBack,
    currentPhaseIndex,
    scatterPlotRef,
    consensusLevelChartRef,
    resetZoom,
  } = graphsSection;

  if (!viewIssue?.analyticalGraphs) return null;

  return (
    <SectionCard
      title="Analytical graphs"
      icon={<AnalyticsIcon fontSize="small" />}
      right={
        activeStep === 0 && viewIssue?.analyticalGraphs?.scatterPlot ? (
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => resetZoom(scatterPlotRef)}
            sx={{ borderColor: "rgba(255,255,255,0.16)" }}
          >
            Reset zoom
          </Button>
        ) : null
      }
    >
      <Stack spacing={2} alignItems="center">
        <Box sx={{ width: "100%", height: { xs: 290, md: 520 } }}>
          {activeStep === 0 && viewIssue?.analyticalGraphs?.scatterPlot ? (
            <AnalyticalScatterChart
              data={viewIssue.analyticalGraphs.scatterPlot}
              phase={currentPhaseIndex}
              scatterPlotRef={scatterPlotRef}
            />
          ) : null}

          {activeStep === 1 && viewIssue?.analyticalGraphs?.consensusLevelLineChart ? (
            <AnalyticalConsensusLineChart
              data={viewIssue.analyticalGraphs.consensusLevelLineChart}
              consensusLevelChartRef={consensusLevelChartRef}
            />
          ) : null}
        </Box>

        {viewIssue?.analyticalGraphs?.consensusLevelLineChart?.data?.length > 1 ? (
          <MobileStepper
            variant="dots"
            steps={2}
            position="static"
            activeStep={activeStep}
            sx={{
              width: "auto",
              bgcolor: "transparent",
              pb: 0,
              "& .MuiMobileStepper-dot": {
                bgcolor: alpha(theme.palette.common.white, 0.26),
              },
              "& .MuiMobileStepper-dotActive": {
                bgcolor: theme.palette.secondary.main,
              },
            }}
            nextButton={
              <Button
                size="small"
                onClick={handleNext}
                disabled={activeStep === 1}
                color="secondary"
                sx={{ mx: 1 }}
              >
                {theme.direction === "rtl" ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
              </Button>
            }
            backButton={
              <Button
                size="small"
                onClick={handleBack}
                disabled={activeStep === 0}
                color="secondary"
                sx={{ mx: 1 }}
              >
                {theme.direction === "rtl" ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
              </Button>
            }
          />
        ) : null}
      </Stack>
    </SectionCard>
  );
};

export default GraphsSection;
