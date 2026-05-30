import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";

export const buildRankedAlternativesPayloadOrThrow = ({ stageResult }) => {
  const rankedAlternatives = Array.isArray(stageResult?.rankedAlternatives)
    ? stageResult.rankedAlternatives
    : null;

  if (!Array.isArray(rankedAlternatives) || rankedAlternatives.length === 0) {
    throw createInternalError("IssueStageResult rankedAlternatives is required", {
      field: "rankedAlternatives",
      details: {
        issueId: toIdString(stageResult?.issue),
        stage: stageResult?.stage,
        consensusPhase: stageResult?.consensusPhase,
      },
    });
  }

  return rankedAlternatives.map((entry, index) => {
    if (!isPlainObject(entry)) {
      throw createInternalError("Invalid rankedAlternatives entry", {
        field: `rankedAlternatives[${index}]`,
      });
    }

    const name =
      typeof entry.name === "string" && entry.name.trim()
        ? entry.name.trim()
        : null;
    if (!name) {
      throw createInternalError("rankedAlternatives entry requires name", {
        field: `rankedAlternatives[${index}].name`,
      });
    }

    const score = Number(entry.score);
    if (!Number.isFinite(score)) {
      throw createInternalError("rankedAlternatives entry requires finite score", {
        field: `rankedAlternatives[${index}].score`,
      });
    }

    const rank = Number(entry.rank);
    if (!Number.isInteger(rank) || rank <= 0) {
      throw createInternalError("rankedAlternatives entry requires positive rank", {
        field: `rankedAlternatives[${index}].rank`,
      });
    }

    const alternativeId =
      typeof entry.alternativeId === "string" ? entry.alternativeId : null;

    return {
      alternativeId,
      name,
      score,
      rank,
    };
  });
};
