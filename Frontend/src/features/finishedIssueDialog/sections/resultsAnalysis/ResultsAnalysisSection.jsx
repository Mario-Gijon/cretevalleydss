import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import ResultsAnalysisView from "./components/ResultsAnalysisView";
import { buildFinishedIssueResultsAnalysisData } from "./logic/buildFinishedIssueResultsAnalysisData";

const ResultsAnalysisSection = () => {
  const { dialog, rankingSection, header, resultsAnalysisSection, resultsAnalysisNavigation } = useFinishedIssueDialogContext();
  const data = buildFinishedIssueResultsAnalysisData({
    viewIssue: dialog.viewIssue,
    ranking: rankingSection.ranking,
    formatScore: rankingSection.formatScore,
    currentPhaseIndex: header.currentPhaseIndex,
    currentPhaseLabel: header.currentPhaseLabel,
    executionLabel: header.selectedRunLabel,
  });

  return <ResultsAnalysisView data={data} navigation={resultsAnalysisNavigation} scatterPlotRef={resultsAnalysisSection.scatterPlotRef} onResetZoom={() => resultsAnalysisSection.resetZoom(resultsAnalysisSection.scatterPlotRef)} />;
};

export default ResultsAnalysisSection;
