import { Box, Button, Stack } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { FINISHED_ISSUE_VIEWS } from "../shared/logic/finishedIssueNavigation";
import { DashboardSection } from "../sections/dashboard";
import { OverviewSection } from "../sections/overview";
import { ResultsAnalysisSection } from "../sections/resultsAnalysis";
import { ConsensusSection } from "../sections/consensus";
import RatingsSection from "../evaluations/RatingsSection";
import ModelsSection from "../models/ModelsSection";
import ModelSpecificOutputSection from "../models/ModelSpecificOutputSection";
import { finishedIssueDialogLayoutSx } from "./finishedIssueShell.styles";

const FinishedIssueDialogLayout = () => {
  const { navigation, modelSpecificOutputSection } = useFinishedIssueDialogContext();
  const view = navigation.activeView;
  const content = {
    [FINISHED_ISSUE_VIEWS.DASHBOARD]: <DashboardSection />,
    [FINISHED_ISSUE_VIEWS.OVERVIEW]: <OverviewSection />,
    [FINISHED_ISSUE_VIEWS.RESULTS_ANALYSIS]: <ResultsAnalysisSection />,
    [FINISHED_ISSUE_VIEWS.EVALUATIONS]: <RatingsSection />,
    [FINISHED_ISSUE_VIEWS.CONSENSUS]: <ConsensusSection />,
    [FINISHED_ISSUE_VIEWS.MODELS]: <Stack spacing={2}><ModelsSection /><ModelSpecificOutputSection {...modelSpecificOutputSection} /></Stack>,
  }[view] || <DashboardSection />;

  return (
    <Box sx={finishedIssueDialogLayoutSx}>
      <Stack spacing={1.25}>
        {view !== FINISHED_ISSUE_VIEWS.DASHBOARD ? (
          <Box>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={navigation.handleBackToDashboard}
            >
              Back to dashboard
            </Button>
          </Box>
        ) : null}
        {content}
      </Stack>
    </Box>
  );
};

export default FinishedIssueDialogLayout;
