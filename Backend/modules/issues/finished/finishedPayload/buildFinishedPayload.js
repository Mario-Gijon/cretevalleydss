import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isFinishedIssue } from "./supportsFinishedPayload.js";
import { buildNonConsensusMatrixFinishedPayload } from "./buildNonConsensusMatrixFinishedPayload.js";
import { buildConsensusMatrixFinishedPayload } from "./buildConsensusMatrixFinishedPayload.js";
import { buildNonConsensusPairwiseFinishedPayload } from "./buildNonConsensusPairwiseFinishedPayload.js";
import { buildConsensusPairwiseFinishedPayload } from "./buildConsensusPairwiseFinishedPayload.js";

export const buildFinishedPayload = async ({ issue }) => {
  if (!isFinishedIssue(issue)) {
    throw createBadRequestError(
      "Finished payload is only supported for finished inactive issues",
      {
        field: "currentStage",
      }
    );
  }

  const structureKey = issue?.alternativeEvaluationStructureKey;

  if (
    structureKey === "alternativeCriteriaMatrix" &&
    issue?.isConsensus !== true
  ) {
    return buildNonConsensusMatrixFinishedPayload({ issue });
  }

  if (
    structureKey === "alternativeCriteriaMatrix" &&
    issue?.isConsensus === true
  ) {
    return buildConsensusMatrixFinishedPayload({ issue });
  }

  if (
    structureKey === "alternativePairwiseByCriterion" &&
    issue?.isConsensus !== true
  ) {
    return buildNonConsensusPairwiseFinishedPayload({ issue });
  }

  if (
    structureKey === "alternativePairwiseByCriterion" &&
    issue?.isConsensus === true
  ) {
    return buildConsensusPairwiseFinishedPayload({ issue });
  }

  throw createBadRequestError(
    "Unsupported finished issue structure for this phase",
    {
      field: "alternativeEvaluationStructureKey",
      details: {
        alternativeEvaluationStructureKey: structureKey || null,
        isConsensus: issue?.isConsensus === true,
      },
    }
  );
};
