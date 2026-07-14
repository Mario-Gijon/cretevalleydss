import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { FINISHED_ISSUE_VIEWS } from "../../shared/logic/finishedIssueNavigation";
import { buildFinishedIssueOverviewData } from "./logic/buildFinishedIssueOverviewData";
import OverviewView from "./components/OverviewView";

const OverviewSection = () => {
  const { dialog, rankingSection, ratingsSection, header, navigation } = useFinishedIssueDialogContext();
  const data = buildFinishedIssueOverviewData({
    viewIssue: dialog.viewIssue,
    ranking: rankingSection.ranking,
    formatScore: rankingSection.formatScore,
    currentPhaseLabel: header.currentPhaseLabel,
    currentPhaseIndex: header.currentPhaseIndex,
    expertList: ratingsSection.expertList,
    evaluationStructure: ratingsSection.evaluationStructure,
    canShowCollective: ratingsSection.canShowCollective,
    criteriaWeightsPayload: ratingsSection.criteriaWeightsEvaluation,
    selectedModelName: header.selectedModelNameView,
    selectedRunKey: header.selectedRunKey,
    selectedRunLabel: header.selectedRunLabel,
    runs: header.runs,
    roundsCount: header.roundsCount,
  });
  const open = (view) => () => navigation.setActiveView(view);

  return <OverviewView data={data} actions={{
    openIssueDetails: open(FINISHED_ISSUE_VIEWS.ISSUE_DETAILS),
    openResults: open(FINISHED_ISSUE_VIEWS.RESULTS),
    openAnalysis: open(FINISHED_ISSUE_VIEWS.ANALYSIS),
    openEvaluations: open(FINISHED_ISSUE_VIEWS.EVALUATIONS),
    openConsensus: open(FINISHED_ISSUE_VIEWS.CONSENSUS),
    openGraphs: open(FINISHED_ISSUE_VIEWS.GRAPHS),
    openModels: open(FINISHED_ISSUE_VIEWS.MODELS),
  }} />;
};

export default OverviewSection;
