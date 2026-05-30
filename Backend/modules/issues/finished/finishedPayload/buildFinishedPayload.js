import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isFinishedIssue } from "./supportsFinishedPayload.js";
import { buildNonConsensusFinishedPayload } from "./buildNonConsensusFinishedPayload.js";
import { buildConsensusFinishedPayload } from "./buildConsensusFinishedPayload.js";
import { getFinishedAlternativeEvaluationStructureOrThrow } from "./buildFinishedEvaluationDisplayPayloads.js";

export const buildFinishedPayload = async ({ issue }) => {
  if (!isFinishedIssue(issue)) {
    throw createBadRequestError(
      "Finished payload is only supported for finished inactive issues",
      {
        field: "currentStage",
      }
    );
  }

  const structure = getFinishedAlternativeEvaluationStructureOrThrow({ issue });

  if (issue?.isConsensus === true) {
    return buildConsensusFinishedPayload({ issue, structure });
  }

  return buildNonConsensusFinishedPayload({ issue, structure });
};
