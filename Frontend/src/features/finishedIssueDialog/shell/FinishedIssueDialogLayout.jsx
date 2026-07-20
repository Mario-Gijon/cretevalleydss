import { Box } from "@mui/material";

import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { FINISHED_ISSUE_VIEWS } from "../shared/logic/finishedIssueNavigation";
import { DashboardSection } from "../sections/dashboard";
import { OverviewSection } from "../sections/overview";
import { ResultsAnalysisSection } from "../sections/resultsAnalysis";
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
    [FINISHED_ISSUE_VIEWS.MODELS]: <ModelsSection />,
  }[view] || <DashboardSection />;

  return (
    <Box sx={finishedIssueDialogLayoutSx}>
      {content}
    </Box>
  );
};

export default FinishedIssueDialogLayout;
