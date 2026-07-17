import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import ResultsAnalysisView from "./components/ResultsAnalysisView";
import { buildResultsAnalysisWorkspaceData } from "./logic/buildResultsAnalysisWorkspaceData.js";

const ResultsAnalysisSection = () => {
  const { dialog, resultsAnalysis, resultsAnalysisNavigation } = useFinishedIssueDialogContext();
  const data = buildResultsAnalysisWorkspaceData({
    payload: dialog.payload,
    selectedExecutionKeys: resultsAnalysis.selection.selectedExecutionKeys,
  });

  return <ResultsAnalysisView data={data} selection={resultsAnalysis.selection} navigation={resultsAnalysisNavigation} scatterPlotRef={resultsAnalysis.scatterPlotRef} onResetZoom={resultsAnalysis.resetZoom} />;
};

export default ResultsAnalysisSection;
