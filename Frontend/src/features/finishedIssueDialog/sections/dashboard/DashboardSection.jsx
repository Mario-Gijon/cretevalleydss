import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { FINISHED_ISSUE_VIEWS } from "../../shared/logic/finishedIssueNavigation";
import { buildResultsAnalysisData, RESULTS_ANALYSIS_VIEWS } from "../resultsAnalysis";
import { buildEvaluationsData } from "../evaluations";
import { buildEvaluationsPreview } from "../evaluations";
import { buildOverviewData, buildOverviewPreview } from "../overview";
import { buildConsensusData, buildConsensusPreview } from "../consensus";
import { buildModelsData, buildModelsPreview } from "../models";
import { buildDashboardData } from "./logic/buildFinishedIssueDashboardData";
import DashboardView from "./components/DashboardView";

const DashboardSection = () => {
  const { dialog, evaluationsSelection, runs, navigation, resultsAnalysis, resultsAnalysisNavigation } = useFinishedIssueDialogContext();
  const evaluations = buildEvaluationsData({ payload: dialog.payload, ...evaluationsSelection });
  const results = buildResultsAnalysisData({ payload: dialog.payload, selectedExecution: runs.selectedExecution, selectedPhase: resultsAnalysis.selectedPhase });
  const data = buildDashboardData({
    overview: buildOverviewPreview(buildOverviewData(dialog.payload)),
    evaluations: buildEvaluationsPreview(evaluations),
    results,
    consensus: buildConsensusPreview(buildConsensusData(dialog.payload)),
    models: buildModelsPreview(buildModelsData({ payload: dialog.payload, selectedExecution: runs.selectedExecution })),
  });
  const open = (view) => () => navigation.selectTab(view);
  const openResultsAnalysis = () => {
    resultsAnalysisNavigation.setActiveView(RESULTS_ANALYSIS_VIEWS.OUTCOME);
    navigation.selectTab(FINISHED_ISSUE_VIEWS.RESULTS_ANALYSIS);
  };
  const openResultsAnalysisView = (view) => () => {
    resultsAnalysisNavigation.setActiveView(view);
    navigation.selectTab(FINISHED_ISSUE_VIEWS.RESULTS_ANALYSIS);
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
