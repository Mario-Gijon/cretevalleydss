import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import ResultsAnalysisView from "./components/ResultsAnalysisView";
import { buildResultsAnalysisData } from "./logic/buildFinishedIssueResultsAnalysisData";

const ResultsAnalysisSection = () => {
  const { dialog, runs, resultsAnalysisSection, resultsAnalysisNavigation } = useFinishedIssueDialogContext();
  const data = buildResultsAnalysisData({ payload: dialog.payload, selectedExecution: runs.selectedExecution, selectedPhase: runs.selectedPhase });

  return <ResultsAnalysisView data={data} navigation={resultsAnalysisNavigation} scatterPlotRef={resultsAnalysisSection.scatterPlotRef} onResetZoom={() => resultsAnalysisSection.resetZoom(resultsAnalysisSection.scatterPlotRef)} />;
};

export default ResultsAnalysisSection;
