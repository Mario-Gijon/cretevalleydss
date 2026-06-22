import { getEvaluationStructureOrThrow } from "../../../decisionPlugins/evaluations/evaluationStructureRegistry.js";
import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";

export const getFinishedAlternativeEvaluationStructureOrThrow = ({ issue }) => {
  const structureKey = issue.evaluationStructureKey;
  const structure = getEvaluationStructureOrThrow(structureKey);

  if (typeof structure.get !== "function") {
    throw createInternalError(
      "Finished issue evaluation structure does not support display payload retrieval",
      {
        field: "evaluationStructureKey",
        details: {
          issueId: toIdString(issue._id),
          evaluationStructureKey: structureKey,
        },
      }
    );
  }

  return structure;
};

const requireFinishedEvaluationExpertOrThrow = (evaluation) => {
  const expert = evaluation.expert;
  if (!expert || typeof expert !== "object") {
    throw createInternalError("Finished evaluation expert data is invalid", {
      field: "evaluations.expert",
      details: {
        issueId: toIdString(evaluation.issue),
        evaluationId: toIdString(evaluation._id),
      },
    });
  }

  const expertId = toIdString(expert._id);
  const expertEmail =
    typeof expert.email === "string" ? expert.email.trim() : "";

  if (!expertId || !expertEmail) {
    throw createInternalError("Finished evaluation expert data is invalid", {
      field: "evaluations.expert",
      details: {
        issueId: toIdString(evaluation.issue),
        evaluationId: toIdString(evaluation._id),
      },
    });
  }

  return expertEmail;
};

export const buildFinishedExpertEvaluationsByEmail = async ({
  structure,
  evaluations,
  evaluationContext,
}) => {
  const expertEvaluations = {};

  for (const evaluation of evaluations) {
    const expertEmail = requireFinishedEvaluationExpertOrThrow(evaluation);

    const payload = await structure.get({
      payload: evaluation?.payload ?? {},
      evaluationContext,
    });

    expertEvaluations[expertEmail] = payload;
  }

  return expertEvaluations;
};
