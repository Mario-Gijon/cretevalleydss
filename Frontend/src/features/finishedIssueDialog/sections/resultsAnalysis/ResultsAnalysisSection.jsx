import { useEffect, useRef } from "react";

import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import ResultsAnalysisView from "./components/ResultsAnalysisView";
import { buildResultsAnalysisWorkspaceData } from "./logic/buildResultsAnalysisWorkspaceData.js";
import { useGenericAnalysis } from "./hooks/useGenericAnalysis.js";

const ResultsAnalysisSection = () => {
  const { dialog, selectedIssue, resultsAnalysis, resultsAnalysisNavigation } = useFinishedIssueDialogContext();
  const issueId = selectedIssue?.id || selectedIssue?._id;
  const genericAnalysis = useGenericAnalysis(issueId);
  const previousPhaseRef = useRef(resultsAnalysis.selectedPhase);
  useEffect(() => {
    if (previousPhaseRef.current !== resultsAnalysis.selectedPhase) {
      resultsAnalysis.scatterPlotRef.current?.resetZoom?.();
      previousPhaseRef.current = resultsAnalysis.selectedPhase;
    }
  }, [resultsAnalysis.scatterPlotRef, resultsAnalysis.selectedPhase]);
  const data = buildResultsAnalysisWorkspaceData({
    payload: dialog.payload,
    selectedExecutionKeys: resultsAnalysis.selection.selectedExecutionKeys,
    selectedPhase: resultsAnalysis.selectedPhase,
  });

  return <ResultsAnalysisView data={data} selection={resultsAnalysis.selection} navigation={resultsAnalysisNavigation} genericAnalysis={genericAnalysis} scatterPlotRef={resultsAnalysis.scatterPlotRef} onResetZoom={resultsAnalysis.resetZoom} />;
};

export default ResultsAnalysisSection;
