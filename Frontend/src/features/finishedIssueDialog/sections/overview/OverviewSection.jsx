import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";

import OverviewView from "./components/OverviewView";
import { buildOverviewData } from "./logic/buildFinishedIssueOverviewData";

const OverviewSection = () => {
  const { dialog } = useFinishedIssueDialogContext();
  const data = buildOverviewData(dialog.payload);

  return <OverviewView data={data} />;
};

export default OverviewSection;
