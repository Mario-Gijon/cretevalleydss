import { Box, Button, Stack } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { useFinishedIssueDialogContext } from "../context/finishedIssueDialog.context";
import { FINISHED_ISSUE_VIEWS } from "../shared/logic/finishedIssueNavigation";
import { OverviewSection } from "../sections/overview";
import { SummarySection } from "../sections/summary";
import RankingSection from "../overview/RankingSection";
import AnalysisSection from "../overview/AnalysisSection";
import ConsensusSection from "../overview/ConsensusSection";
import GraphsSection from "../graphs/GraphsSection";
import RatingsSection from "../evaluations/RatingsSection";
import ModelsSection from "../models/ModelsSection";
import ModelSpecificOutputSection from "../models/ModelSpecificOutputSection";
import { finishedIssueDialogLayoutSx } from "./finishedIssueShell.styles";

const FinishedIssueDialogLayout = () => {
  const { navigation, modelSpecificOutputSection } = useFinishedIssueDialogContext();
  const view = navigation.activeView;
  const content = {
    [FINISHED_ISSUE_VIEWS.OVERVIEW]: <OverviewSection />,
    [FINISHED_ISSUE_VIEWS.ISSUE_DETAILS]: <SummarySection />,
    [FINISHED_ISSUE_VIEWS.RESULTS]: <Stack spacing={2}><RankingSection /><GraphsSection /></Stack>,
    [FINISHED_ISSUE_VIEWS.GRAPHS]: <GraphsSection />,
    [FINISHED_ISSUE_VIEWS.ANALYSIS]: <AnalysisSection />,
    [FINISHED_ISSUE_VIEWS.EVALUATIONS]: <RatingsSection />,
    [FINISHED_ISSUE_VIEWS.CONSENSUS]: <ConsensusSection />,
    [FINISHED_ISSUE_VIEWS.MODELS]: <Stack spacing={2}><ModelsSection />{modelSpecificOutputSection?.hasOutput ? <ModelSpecificOutputSection {...modelSpecificOutputSection} /> : null}</Stack>,
  }[view] || <OverviewSection />;

  return (
    <Box sx={finishedIssueDialogLayoutSx}>
      <Stack spacing={1.25}>
        {view !== FINISHED_ISSUE_VIEWS.OVERVIEW ? (
          <Box>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={navigation.handleBackToOverview}
            >
              Back to overview
            </Button>
          </Box>
        ) : null}
        {content}
      </Stack>
    </Box>
  );
};

export default FinishedIssueDialogLayout;
