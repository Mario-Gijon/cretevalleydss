import { Alert, Stack } from "@mui/material";

import { RESULTS_ANALYSIS_VIEWS, isResultsAnalysisView } from "../logic/resultsAnalysisNavigation";
import VisualizationsPanel from "./VisualizationsPanel";
import InterpretationPanel from "./InterpretationPanel";
import ResultsAnalysisNavigation from "./ResultsAnalysisNavigation";
import ExecutionSelectionToolbar from "./ExecutionSelectionToolbar";

const ResultsAnalysisView = ({ data, selection, navigation, reload }) => {
  const analysisAvailable = data.analysisAvailable !== false;
  const activeView = isResultsAnalysisView(navigation.activeView)
    ? navigation.activeView
    : RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS;

  return (
    <Stack spacing={2}>
      <ResultsAnalysisNavigation activeView={activeView} onChange={navigation.setActiveView} />
      <ExecutionSelectionToolbar data={data} selectedExecutionKeys={selection.selectedExecutionKeys} onToggleExecution={selection.toggleExecution} onRemoveExecution={selection.removeExecution} reload={reload} />
      {!analysisAvailable ? <Alert severity="info" data-testid="results-analysis-unavailable">{data.analysisUnavailableReason}</Alert> : null}
      {analysisAvailable && activeView === RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS ? <VisualizationsPanel visualizations={data.visualizations} executions={data.selected} categoricalComparisons={data.categoricalComparisons} /> : null}
      {analysisAvailable && activeView === RESULTS_ANALYSIS_VIEWS.INTERPRETATION ? <InterpretationPanel executions={data.selected} /> : null}
    </Stack>
  );
};

export default ResultsAnalysisView;
