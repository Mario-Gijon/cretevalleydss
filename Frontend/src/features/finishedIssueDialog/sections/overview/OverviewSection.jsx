import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import OverviewView from "./components/OverviewView";
import { buildOverviewData } from "./logic/buildFinishedIssueOverviewData";

const OverviewSection = () => {
  const { dialog, overview } = useFinishedIssueDialogContext();
  const data = buildOverviewData(dialog.payload);

  return <OverviewView data={data} state={{
    descriptionExpanded: overview.disclosure.description,
    criteriaExpanded: overview.disclosure.criteria,
    alternativesExpanded: overview.disclosure.alternatives,
    expertsExpanded: overview.disclosure.experts,
  }} actions={{
    toggleDescription: () => overview.toggleDisclosure("description"),
    toggleCriteria: () => overview.toggleDisclosure("criteria"),
    toggleAlternatives: () => overview.toggleDisclosure("alternatives"),
    toggleExperts: () => overview.toggleDisclosure("experts"),
  }} />;
};

export default OverviewSection;
