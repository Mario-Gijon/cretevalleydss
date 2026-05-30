import { buildConsensusFinishedPayload } from "./buildConsensusFinishedPayload.js";

export const buildConsensusPairwiseFinishedPayload = async ({ issue }) => {
  return buildConsensusFinishedPayload({
    issue,
    variant: "pairwise",
  });
};
