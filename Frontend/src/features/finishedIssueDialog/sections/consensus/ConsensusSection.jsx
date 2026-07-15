import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { buildConsensusData } from "./logic/buildConsensusData.js";
import ConsensusView from "./components/ConsensusView.jsx";

const ConsensusSection = () => {
  const { dialog } = useFinishedIssueDialogContext();
  const data = buildConsensusData(dialog.payload);
  return <ConsensusView data={data} />;
};

export default ConsensusSection;
