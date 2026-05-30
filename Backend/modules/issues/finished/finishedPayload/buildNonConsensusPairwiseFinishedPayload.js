import { buildNonConsensusFinishedPayload } from "./buildNonConsensusFinishedPayload.js";

export const buildNonConsensusPairwiseFinishedPayload = async ({ issue }) => {
  return buildNonConsensusFinishedPayload({
    issue,
    variant: "pairwise",
  });
};
