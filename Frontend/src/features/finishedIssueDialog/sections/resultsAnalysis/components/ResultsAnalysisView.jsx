import { Stack } from "@mui/material";

import { RESULTS_ANALYSIS_VIEWS } from "../logic/resultsAnalysisNavigation";
import OutcomePanel from "./OutcomePanel";
import VisualizationsPanel from "./VisualizationsPanel";
import InterpretationPanel from "./InterpretationPanel";
import ResultsAnalysisNavigation from "./ResultsAnalysisNavigation";
import ExecutionSelectionToolbar from "./ExecutionSelectionToolbar";

const ResultsAnalysisView = ({ data, selection, navigation, scatterPlotRef, onResetZoom }) => (
  <Stack spacing={2}>
    <ResultsAnalysisNavigation activeView={navigation.activeView} onChange={navigation.setActiveView} />
    <ExecutionSelectionToolbar data={data} selectedExecutionKeys={selection.selectedExecutionKeys} onToggleExecution={selection.toggleExecution} onRemoveExecution={selection.removeExecution} />
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS ? <VisualizationsPanel visualizations={data.visualizations} scatterPlotRef={scatterPlotRef} onResetZoom={onResetZoom} /> : null}
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.INTERPRETATION ? <InterpretationPanel interpretation={data.interpretation} /> : null}
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.OUTCOME ? <OutcomePanel data={data} /> : null}
  </Stack>
);

export default ResultsAnalysisView;
