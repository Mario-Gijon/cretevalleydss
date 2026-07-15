import { Box, Button, Stack } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { FINISHED_ISSUE_VIEWS } from "../shared/logic/finishedIssueNavigation";
import { DashboardSection } from "../sections/dashboard";
import { OverviewSection } from "../sections/overview";
import { ResultsAnalysisSection } from "../sections/resultsAnalysis";
import { ConsensusSection } from "../sections/consensus";
import { EvaluationsSection } from "../sections/evaluations";
import { ModelsSection } from "../sections/models";
import { finishedIssueDialogLayoutSx } from "./finishedIssueShell.styles";

const FinishedIssueDialogLayout = () => {
  const { navigation } = useFinishedIssueDialogContext();
  const view = navigation.activeView;
  const content = {
    [FINISHED_ISSUE_VIEWS.DASHBOARD]: <DashboardSection />,
    [FINISHED_ISSUE_VIEWS.OVERVIEW]: <OverviewSection />,
    [FINISHED_ISSUE_VIEWS.RESULTS_ANALYSIS]: <ResultsAnalysisSection />,
    [FINISHED_ISSUE_VIEWS.EVALUATIONS]: <EvaluationsSection />,
    [FINISHED_ISSUE_VIEWS.CONSENSUS]: <ConsensusSection />,
    [FINISHED_ISSUE_VIEWS.MODELS]: <ModelsSection />,
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
              onClick={navigation.backToDashboard}
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
