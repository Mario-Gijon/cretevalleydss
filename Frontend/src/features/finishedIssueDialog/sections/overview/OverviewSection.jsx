import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";

import OverviewView from "./components/OverviewView";
import { buildOverviewData } from "./logic/buildFinishedIssueOverviewData";
import { buildEvaluationsWorkspaceData } from "../evaluations/logic/buildEvaluationsWorkspaceData";

const OverviewSection = () => {
  const { dialog } = useFinishedIssueDialogContext();
  const payload = dialog.payload;
  const data = {
    ...buildOverviewData(payload),
    expertParticipation: buildEvaluationsWorkspaceData({ payload, selection: null }).participation,
  };

  return <OverviewView data={data} />;
};

export default OverviewSection;
