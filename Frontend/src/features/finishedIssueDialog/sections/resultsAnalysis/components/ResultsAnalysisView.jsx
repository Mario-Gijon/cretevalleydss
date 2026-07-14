import { Stack } from "@mui/material";

import { RESULTS_ANALYSIS_VIEWS } from "../logic/resultsAnalysisNavigation";
import OutcomePanel from "./OutcomePanel";
import VisualizationsPanel from "./VisualizationsPanel";
import InterpretationPanel from "./InterpretationPanel";
import ResultsAnalysisNavigation from "./ResultsAnalysisNavigation";

const ResultsAnalysisView = ({ data, navigation, scatterPlotRef, onResetZoom }) => (
  <Stack spacing={2}>
    <ResultsAnalysisNavigation activeView={navigation.activeView} onChange={navigation.setActiveView} />
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS ? <VisualizationsPanel visualizations={data.visualizations} scatterPlotRef={scatterPlotRef} onResetZoom={onResetZoom} /> : null}
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.INTERPRETATION ? <InterpretationPanel interpretation={data.interpretation} /> : null}
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.OUTCOME ? <OutcomePanel context={data.context} outcome={data.outcome} /> : null}
  </Stack>
);

export default ResultsAnalysisView;
