import { Tab, Tabs } from "@mui/material";

import { RESULTS_ANALYSIS_VIEWS } from "../logic/resultsAnalysisNavigation";

const labels = {
  [RESULTS_ANALYSIS_VIEWS.OUTCOME]: "Outcome",
  [RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS]: "Visualizations",
  [RESULTS_ANALYSIS_VIEWS.INTERPRETATION]: "Interpretation",
};

const ResultsAnalysisNavigation = ({ activeView, onChange }) => (
  <Tabs value={activeView} onChange={(_, view) => onChange(view)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile textColor="secondary" indicatorColor="secondary">
    {Object.values(RESULTS_ANALYSIS_VIEWS).map((view) => <Tab key={view} value={view} label={labels[view]} sx={{ textTransform: "none" }} />)}
  </Tabs>
);

export default ResultsAnalysisNavigation;
