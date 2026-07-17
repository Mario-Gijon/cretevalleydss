import { Stack, Typography } from "@mui/material";

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
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS ? data.mode === "single" ? <VisualizationsPanel visualizations={data.primary?.visualizations} scatterPlotRef={scatterPlotRef} onResetZoom={onResetZoom} /> : <ComparisonVisualizationsPlaceholder /> : null}
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.INTERPRETATION ? <InterpretationPanel interpretation={data.interpretation} /> : null}
    {navigation.activeView === RESULTS_ANALYSIS_VIEWS.OUTCOME ? <OutcomePanel data={data} /> : null}
  </Stack>
);

const ComparisonVisualizationsPlaceholder = () => <Stack justifyContent="center" alignItems="center" sx={{ minHeight: 260, borderRadius: 3, border: "1px solid rgba(83,198,214,0.16)", bgcolor: "rgba(8,18,29,0.88)", color: "text.secondary", fontSize: 13, textAlign: "center", px: 2 }}><Typography color="text.secondary">Comparative visualizations are not implemented yet.</Typography></Stack>;

export default ResultsAnalysisView;
