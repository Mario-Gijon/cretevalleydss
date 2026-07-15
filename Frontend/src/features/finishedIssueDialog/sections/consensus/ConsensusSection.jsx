import { useFinishedIssueDialogContext } from "../../context/finishedIssueDialog.context";
import { buildConsensusData } from "./logic/buildConsensusData.js";
import ConsensusView from "./components/ConsensusView.jsx";

const ConsensusSection = () => {
  const { dialog } = useFinishedIssueDialogContext();
  const consensus = buildConsensusData(dialog.payload);
  const data = { ...consensus, graph: { labels: consensus.series.map((entry) => `Phase ${entry.phase}`), data: consensus.series.map((entry) => entry.measure) } };
  return <ConsensusView data={data} />;
};

export default ConsensusSection;
