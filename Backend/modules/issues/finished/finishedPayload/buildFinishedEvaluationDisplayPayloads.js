import { getEvaluationStructureOrThrow } from "../../../decisionEngine/evaluations/evaluation.registry.js";
import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";

export const getFinishedAlternativeEvaluationStructureOrThrow = ({ issue }) => {
  const structureKey = issue?.alternativeEvaluationStructureKey;
  const structure = getEvaluationStructureOrThrow(structureKey);

  if (typeof structure?.get !== "function") {
    throw createInternalError(
      "Finished issue evaluation structure does not support display payload retrieval",
      {
        field: "alternativeEvaluationStructureKey",
        details: {
          issueId: toIdString(issue?._id),
          alternativeEvaluationStructureKey: structureKey || null,
        },
      }
    );
  }

  return structure;
};

export const buildFinishedExpertEvaluationsByEmail = async ({
  structure,
  evaluations,
  structureContext,
}) => {
  const expertEvaluations = {};

  for (const evaluation of evaluations) {
    const expertId = toIdString(evaluation?.expert?._id || evaluation?.expert);
    const expertEmailRaw = evaluation?.expert?.email;
    const expertEmail =
      typeof expertEmailRaw === "string" && expertEmailRaw.trim()
        ? expertEmailRaw.trim()
        : `expert_${expertId || "unknown"}`;

    const payload = await structure.get({
      storedEvaluation: evaluation,
      structureContext,
    });

    expertEvaluations[expertEmail] = payload;
  }

  return expertEvaluations;
};
