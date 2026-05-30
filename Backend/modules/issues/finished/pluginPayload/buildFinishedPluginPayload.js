import { createBadRequestError } from "../../../../utils/common/errors.js";
import { isFinishedIssue } from "./supportsFinishedPluginPayload.js";
import { buildNonConsensusMatrixFinishedPayload } from "./buildNonConsensusMatrixFinishedPayload.js";
import { buildConsensusMatrixFinishedPayload } from "./buildConsensusMatrixFinishedPayload.js";
import { buildNonConsensusPairwiseFinishedPayload } from "./buildNonConsensusPairwiseFinishedPayload.js";
import { buildConsensusPairwiseFinishedPayload } from "./buildConsensusPairwiseFinishedPayload.js";

export const buildPluginFinishedIssuePayload = async ({ issue }) => {
  if (!isFinishedIssue(issue)) {
    throw createBadRequestError(
      "Plugin finished payload is only supported for finished inactive issues",
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
    "Unsupported plugin finished issue structure for this phase",
    {
      field: "alternativeEvaluationStructureKey",
      details: {
        alternativeEvaluationStructureKey: structureKey || null,
        isConsensus: issue?.isConsensus === true,
      },
    }
  );
};
