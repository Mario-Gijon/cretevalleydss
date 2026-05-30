import { buildConsensusFinishedPayload } from "./buildConsensusFinishedPayload.js";

export const buildConsensusMatrixFinishedPayload = async ({ issue }) => {
  return buildConsensusFinishedPayload({
    issue,
    variant: "matrix",
  });
};
