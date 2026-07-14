import { Box, Divider } from "@mui/material";

import { Row } from "../../../shared/components/FinishedIssueDialogPrimitives";
import { overviewDividerSx } from "../overview.styles";

const ConsensusConfiguration = ({ consensus }) => {
  if (!consensus) return null;

  return (
    <Box>
      <Divider sx={overviewDividerSx} />
      <Row label="Consensus threshold" value={consensus.threshold} />
      <Row label="Consensus max phases" value={consensus.maxPhases} />
      <Row label="Consensus reached phase" value={consensus.reachedPhaseLabel} />
      <Row label="Finalization reason" value={consensus.finalizationReason ?? "—"} />
      <Row label="Final consensus" value={consensus.finalMeasure ?? "—"} />
    </Box>
  );
};

export default ConsensusConfiguration;
