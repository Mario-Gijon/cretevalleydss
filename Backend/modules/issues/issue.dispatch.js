// Models
import { Issue } from "../../models/Issues.js";

// Modules
import {
  EVALUATION_STRUCTURES,
  resolveEvaluationStructure,
} from "./issue.evaluationStructure.js";

// Utils
import {
  createBadRequestError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { isValidObjectIdLike } from "../../utils/common/mongoose.js";

/**
 * Devuelve el handler adecuado según la estructura de evaluación del issue.
 *
 * @param {string} evaluationStructure Estructura de evaluación resuelta.
 * @param {Object} handlers Handlers disponibles.
 * @returns {Function|null}
 */
export const getIssueStructureHandler = (evaluationStructure, handlers) => {
  switch (evaluationStructure) {
    case EVALUATION_STRUCTURES.DIRECT:
      return handlers.direct || null;

    case EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES:
      return handlers.pairwise || null;

    default:
      return null;
  }
};

/**
 * Resuelve la estructura de evaluación de un issue por id.
 *
 * @param {string|Object} issueId Id del issue.
 * @returns {Promise<string>}
 */
export const resolveIssueEvaluationStructureOrThrow = async (issueId) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const issue = await Issue.findById(issueId)
    .select("_id evaluationStructure isPairwise")
    .lean();

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return resolveEvaluationStructure(issue);
};

/**
 * Resuelve el handler adecuado para un issue según su estructura de evaluación.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Object} params.handlers Handlers candidatos.
 * @returns {Promise<Object>}
 */
export const resolveIssueHandlerOrThrow = async ({ issueId, handlers }) => {
  const evaluationStructure =
    await resolveIssueEvaluationStructureOrThrow(issueId);

  const handler = getIssueStructureHandler(evaluationStructure, handlers);

  if (!handler) {
    throw createBadRequestError(
      `Unsupported evaluation structure '${evaluationStructure}'`
    );
  }

  return {
    handler,
    evaluationStructure,
  };
};