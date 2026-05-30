import { buildNonConsensusFinishedPayload } from "./buildNonConsensusFinishedPayload.js";

export const buildNonConsensusMatrixFinishedPayload = async ({ issue }) => {
  return buildNonConsensusFinishedPayload({
    issue,
    variant: "matrix",
  });
};
