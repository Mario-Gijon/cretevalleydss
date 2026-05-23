import { Issue } from "../../../models/Issues.js";
import {
  buildPluginFinishedIssuePayload,
  supportsPluginFinishedIssuePayload,
} from "./finishedIssue.pluginPayload.js";

import {
  createBadRequestError,
  createInternalError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";

/**
 * Construye el payload completo de detalle para un issue finalizado.
 *
 * El flujo actual usa exclusivamente el payload plugin-like basado en:
 * - IssueEvaluation
 * - IssueStageResult
 * - alternativeEvaluationStructureKey
 * - criteriaWeightingStructureKey
 *
 * No mantiene fallback legacy basado en Evaluation.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @returns {Promise<Object>}
 */
export const getFinishedIssueInfoPayload = async ({ issueId }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const issue = await Issue.findById(issueId)
    .populate("model")
    .populate("admin", "email name")
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  if (!supportsPluginFinishedIssuePayload(issue)) {
    throw createInternalError(
      "Finished issue requires plugin evaluation payload support",
      {
        field: "alternativeEvaluationStructureKey",
        details: {
          issueId: issue._id.toString(),
        },
      }
    );
  }

  return buildPluginFinishedIssuePayload({ issue });
};