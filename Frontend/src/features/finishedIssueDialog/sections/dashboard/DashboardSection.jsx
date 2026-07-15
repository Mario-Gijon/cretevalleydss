import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { FINISHED_ISSUE_VIEWS } from "../../shared/logic/finishedIssueNavigation";
import { RESULTS_ANALYSIS_VIEWS } from "../resultsAnalysis";
import { buildDashboardData } from "./logic/buildFinishedIssueDashboardData";
import DashboardView from "./components/DashboardView";

const DashboardSection = () => {
  const { dialog, ratingsSection, runs, navigation, resultsAnalysisNavigation } = useFinishedIssueDialogContext();
  const data = buildDashboardData({ payload: dialog.payload, selectedExecution: runs.selectedExecution, selectedPhase: runs.selectedPhase, evaluations: ratingsSection });
  const open = (view) => () => navigation.setActiveView(view);
  const openResultsAnalysis = () => {
    resultsAnalysisNavigation.setActiveView(RESULTS_ANALYSIS_VIEWS.OUTCOME);
    navigation.setActiveView(FINISHED_ISSUE_VIEWS.RESULTS_ANALYSIS);
  };
  const openResultsAnalysisView = (view) => () => {
    resultsAnalysisNavigation.setActiveView(view);
    navigation.setActiveView(FINISHED_ISSUE_VIEWS.RESULTS_ANALYSIS);
  };

  return <DashboardView data={data} actions={{
    openOverview: open(FINISHED_ISSUE_VIEWS.OVERVIEW),
    openResultsAnalysis,
    openOutcome: openResultsAnalysisView(RESULTS_ANALYSIS_VIEWS.OUTCOME),
    openVisualizations: openResultsAnalysisView(RESULTS_ANALYSIS_VIEWS.VISUALIZATIONS),
    openInterpretation: openResultsAnalysisView(RESULTS_ANALYSIS_VIEWS.INTERPRETATION),
    openEvaluations: open(FINISHED_ISSUE_VIEWS.EVALUATIONS),
    openConsensus: open(FINISHED_ISSUE_VIEWS.CONSENSUS),
    openModels: open(FINISHED_ISSUE_VIEWS.MODELS),
  }} />;
};

export default DashboardSection;
