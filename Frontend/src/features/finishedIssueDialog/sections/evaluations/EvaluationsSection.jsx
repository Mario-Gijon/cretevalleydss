import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";

import EvaluationsView from "./components/EvaluationsView";
import { buildEvaluationsWorkspaceData } from "./logic/buildEvaluationsWorkspaceData";

const EvaluationsSection = () => {
  const { dialog, evaluationsSelection } =
    useFinishedIssueDialogContext();

  const data = buildEvaluationsWorkspaceData({
    payload: dialog.payload,
    selection: evaluationsSelection,
  });

  return (
    <EvaluationsView
      data={data}
      state={evaluationsSelection}
      actions={evaluationsSelection}
    />
  );
};

export default EvaluationsSection;
