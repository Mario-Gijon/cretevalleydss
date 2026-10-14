import { Stack } from "@mui/material";

import { RESULTS_ANALYSIS_VIEWS, isResultsAnalysisView } from "../logic/resultsAnalysisNavigation";
import VisualizationsPanel from "./VisualizationsPanel";
import InterpretationPanel from "./InterpretationPanel";
import ResultsAnalysisNavigation from "./ResultsAnalysisNavigation";
import ExecutionSelectionToolbar from "./ExecutionSelectionToolbar";

const ResultsAnalysisView = ({ data, selection, navigation, reload }) => {
  const activeView = isResultsAnalysisView(navigation.activeView)
    ? navigation.activeView
    : RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS;

  return (
    <Stack spacing={2}>
      <ResultsAnalysisNavigation activeView={activeView} onChange={navigation.setActiveView} />
      <ExecutionSelectionToolbar data={data} selectedExecutionKeys={selection.selectedExecutionKeys} onToggleExecution={selection.toggleExecution} onRemoveExecution={selection.removeExecution} reload={reload} />
      {activeView === RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS ? <VisualizationsPanel visualizations={data.visualizations} executions={data.selected} /> : null}
      {activeView === RESULTS_ANALYSIS_VIEWS.INTERPRETATION ? <InterpretationPanel executions={data.selected} /> : null}
    </Stack>
  );
};

export default ResultsAnalysisView;
