import { Stack } from "@mui/material";

import { RESULTS_ANALYSIS_VIEWS } from "../logic/resultsAnalysisNavigation";
import OutcomePanel from "./OutcomePanel";
import VisualizationsPanel from "./VisualizationsPanel";
import InterpretationPanel from "./InterpretationPanel";
import ResultsAnalysisNavigation from "./ResultsAnalysisNavigation";
import ExecutionSelectionToolbar from "./ExecutionSelectionToolbar";
import GlobalAnalysisSection from "../../globalAnalysis/GlobalAnalysisSection.jsx";

const ResultsAnalysisView = ({ data, selection, navigation, scatterPlotRef, onResetZoom }) => (
  <Stack spacing={2}>
    <ResultsAnalysisNavigation activeView={navigation.activeView} onChange={navigation.setActiveView} />
    {navigation.activeView !== RESULTS_ANALYSIS_VIEWS.GLOBAL ? <ExecutionSelectionToolbar data={data} selectedExecutionKeys={selection.selectedExecutionKeys} onToggleExecution={selection.toggleExecution} onRemoveExecution={selection.removeExecution} /> : null}
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS ? <VisualizationsPanel visualizations={data.visualizations} scatterPlotRef={scatterPlotRef} onResetZoom={onResetZoom} /> : null}
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.INTERPRETATION ? <InterpretationPanel interpretation={data.interpretation} /> : null}
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.OUTCOME ? <OutcomePanel data={data} /> : null}
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.GLOBAL ? <GlobalAnalysisSection /> : null}
  </Stack>
);

export default ResultsAnalysisView;
