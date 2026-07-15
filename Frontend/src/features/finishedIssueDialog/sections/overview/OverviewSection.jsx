import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import OverviewView from "./components/OverviewView";
import { buildOverviewData } from "./logic/buildFinishedIssueOverviewData";

const OverviewSection = () => {
  const { overviewSection } = useFinishedIssueDialogContext();
  const {
    openDescriptionList,
    setOpenDescriptionList,
    openCriteriaList,
    setOpenCriteriaList,
    openAlternativeList,
    setOpenAlternativesList,
    openExpertsList,
    setOpenExpertsList,
  } = overviewSection;
  const data = buildOverviewData(overviewSection.payload);

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
