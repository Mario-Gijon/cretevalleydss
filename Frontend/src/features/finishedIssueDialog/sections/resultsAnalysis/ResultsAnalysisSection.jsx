import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import ResultsAnalysisView from "./components/ResultsAnalysisView";
import { buildResultsAnalysisData } from "./logic/buildResultsAnalysisData.js";

const ResultsAnalysisSection = () => {
  const { dialog, runs, resultsAnalysis, resultsAnalysisNavigation } = useFinishedIssueDialogContext();
  const data = buildResultsAnalysisData({ payload: dialog.payload, selectedExecution: runs.selectedExecution, selectedPhase: resultsAnalysis.selectedPhase });

  return <ResultsAnalysisView data={data} navigation={resultsAnalysisNavigation} scatterPlotRef={resultsAnalysis.scatterPlotRef} onResetZoom={resultsAnalysis.resetZoom} />;
};

export default ResultsAnalysisSection;
