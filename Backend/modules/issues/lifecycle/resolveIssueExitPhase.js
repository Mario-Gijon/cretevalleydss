import { Consensus } from "../../../models/Consensus.js";
import { applyOptionalSession } from "../../../utils/common/mongoose.js";

export const resolveIssueExitPhase = async ({
  issueId,
  fallbackIfMissing,
  session = null,
}) => {
  const latestConsensus = await applyOptionalSession(
    Consensus.findOne({ issue: issueId }).sort({ phase: -1 }),
    session
  );

  return latestConsensus ? latestConsensus.phase + 1 : fallbackIfMissing;
};
