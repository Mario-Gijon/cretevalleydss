import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { buildEvaluationsData } from "./logic/buildEvaluationsData.js";
import EvaluationsView from "./components/EvaluationsView.jsx";

const EvaluationsSection = () => {
  const { dialog, evaluationsSelection } = useFinishedIssueDialogContext();
  const data = buildEvaluationsData({ payload: dialog.payload, ...evaluationsSelection });
  return <EvaluationsView data={data} state={evaluationsSelection} actions={evaluationsSelection} />;
};

export default EvaluationsSection;
