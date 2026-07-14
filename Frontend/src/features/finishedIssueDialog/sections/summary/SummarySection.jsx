import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { formatConsensusRoundLabel } from "../../shared/logic/formatConsensusRoundLabel";
import SummaryView from "./components/SummaryView";
import { buildFinishedIssueSummaryData } from "./logic/buildFinishedIssueSummaryData";

const SummarySection = () => {
  const { summarySection } = useFinishedIssueDialogContext();
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
  } = summarySection;
  const reachedPhase = viewIssue?.summary?.consensusInfo?.consensusReachedPhase;
  const data = buildFinishedIssueSummaryData({
    viewIssue,
    selectedModelName: selectedModelNameView,
    reachedPhaseLabel: reachedPhase !== undefined ? formatConsensusRoundLabel(reachedPhase) : "—",
  });

  return <SummaryView data={data} state={{
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

export default SummarySection;
