import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { buildDashboardData } from "./logic/buildFinishedIssueDashboardData";
import DashboardView from "./components/DashboardView";

const DashboardSection = () => {
  const { dialog, runs } = useFinishedIssueDialogContext();
  const data = buildDashboardData({ payload: dialog.payload, selectedExecution: runs.selectedExecution });
  return <DashboardView data={data} />;
};

export default DashboardSection;
