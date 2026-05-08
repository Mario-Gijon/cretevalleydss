import { Consensus } from "../../../models/Consensus.js";

export const getConsensusRoundsForIssue = async (issueId) =>
  Consensus.find({ issue: issueId }).sort({ phase: 1 }).lean();
