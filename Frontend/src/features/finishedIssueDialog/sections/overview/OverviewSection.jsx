import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { formatConsensusRoundLabel } from "../../shared/logic/formatConsensusRoundLabel";
import OverviewView from "./components/OverviewView";
import { buildFinishedIssueOverviewData } from "./logic/buildFinishedIssueOverviewData";

const OverviewSection = () => {
  const { overviewSection } = useFinishedIssueDialogContext();
  const {
    viewIssue,
    selectedModelNameView,
    openDescriptionList,
    setOpenDescriptionList,
    openCriteriaList,
    setOpenCriteriaList,
    openAlternativeList,
    setOpenAlternativesList,
    openExpertsList,
    setOpenExpertsList,
  } = overviewSection;
  const reachedPhase = viewIssue?.summary?.consensusInfo?.consensusReachedPhase;
  const data = buildFinishedIssueOverviewData({
    viewIssue,
    selectedModelName: selectedModelNameView,
    reachedPhaseLabel: reachedPhase !== undefined ? formatConsensusRoundLabel(reachedPhase) : "—",
  });

  return <OverviewView data={data} state={{
    descriptionExpanded: openDescriptionList,
    criteriaExpanded: openCriteriaList,
    alternativesExpanded: openAlternativeList,
    expertsExpanded: openExpertsList,
  }} actions={{
    toggleDescription: () => setOpenDescriptionList((value) => !value),
    toggleCriteria: () => setOpenCriteriaList((value) => !value),
    toggleAlternatives: () => setOpenAlternativesList((value) => !value),
    toggleExperts: () => setOpenExpertsList((value) => !value),
  }} />;
};

export default OverviewSection;
