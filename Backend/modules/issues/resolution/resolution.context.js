import { Issue } from "../../../models/Issues.js";
import { IssueModel } from "../../../models/IssueModels.js";
import { Participation } from "../../../models/Participations.js";

import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../issue.ordering.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";

/**
 * Carga y valida el contexto común necesario para resolver un issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del usuario actual.
 * @param {string} params.expectedStructure Estructura de evaluación esperada.
 * @param {string} params.invalidStructureMessage Mensaje de error si la estructura no coincide.
 * @returns {Promise<Object>}
 */
export const getResolutionContext = async ({
  issueId,
  userId,
  expectedStructure,
  invalidStructureMessage,
}) => {
  const issue = await Issue.findById(issueId);

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  const evaluationStructure = issue.evaluationStructure;
  if (evaluationStructure !== expectedStructure) {
    throw createBadRequestError(invalidStructureMessage);
  }

  const model = await IssueModel.findById(issue.model).lean();
  if (!model) {
    throw createNotFoundError("Issue model not found");
  }

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError(
      "Unauthorized: Only the issue creator can resolve it"
    );
  }

  const participations = await Participation.find({
    issue: issue._id,
    invitationStatus: "accepted",
  })
    .populate("expert", "email")
    .lean();

  const pendingParticipations = participations.filter(
    (participation) => !participation.evaluationCompleted
  );

  if (pendingParticipations.length > 0) {
    throw createBadRequestError(
      "Not all experts have completed their evaluations"
    );
  }

  await ensureIssueOrdersDb({ issueId: issue._id });

  const [alternatives, criteria] = await Promise.all([
    getOrderedAlternativesDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name type",
      lean: true,
    }),
  ]);

  if (!alternatives.length || !criteria.length) {
    throw createBadRequestError("Issue has no alternatives/leaf criteria");
  }

  return {
    issue,
    model,
    participations,
    alternatives,
    criteria,
  };
};
