import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { selectFinishedIssueExecution } from "../../logic/selectFinishedIssueExecution.js";
import { buildDashboardData } from "./logic/buildFinishedIssueDashboardData";
import DashboardView from "./components/DashboardView";

const DashboardSection = () => {
  const { dialog, runs, header } = useFinishedIssueDialogContext();
  const selectedExecution = selectFinishedIssueExecution(dialog.payload, runs.selectedExecutionKey, header.selectedPhase);
  const data = buildDashboardData({ payload: dialog.payload, selectedExecution });
  return <DashboardView data={data} />;
};

export default DashboardSection;
