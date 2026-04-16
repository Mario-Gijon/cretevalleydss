// Models
import { Alternative } from "../../models/Alternatives.js";
import { Consensus } from "../../models/Consensus.js";
import { CriteriaWeightEvaluation } from "../../models/CriteriaWeightEvaluation.js";
import { Criterion } from "../../models/Criteria.js";
import { Evaluation } from "../../models/Evaluations.js";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { Issue } from "../../models/Issues.js";
import { IssueScenario } from "../../models/IssueScenarios.js";
import { Notification } from "../../models/Notificacions.js";
import { Participation } from "../../models/Participations.js";

// Modules
import { getNextConsensusPhase } from "./issue.queries.js";

// Utils
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import {
  sameId,
  toIdString,
  uniqueIdStrings,
} from "../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../utils/common/mongoose.js";

const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

/**
 * Devuelve el stage compatible con ExitUserIssue a partir del currentStage del issue.
 *
 * @param {string | null | undefined} stage Stage actual del issue.
 * @returns {string | null}
 */
export const mapIssueStageToExitStage = (stage) => {
  if (stage === "criteriaWeighting" || stage === "weightsFinished") {
    return "criteriaWeighting";
  }

  if (stage === "alternativeEvaluation") {
    return "alternativeEvaluation";
  }

  return null;
};

/**
 * Registra una salida de usuario en ExitUserIssue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del usuario.
 * @param {number | null} params.phase Fase asociada.
 * @param {string | null} params.stage Stage compatible.
 * @param {string} params.reason Motivo de la salida.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<void>}
 */
export const registerUserExit = async ({
  issueId,
  userId,
  phase,
  stage,
  reason,
  session = null,
}) => {
  const now = new Date();

  const historyEntry = {
    timestamp: now,
    phase,
    stage,
    action: "exited",
    reason,
  };

  await withOptionalSession(
    ExitUserIssue.findOneAndUpdate(
      { issue: issueId, user: userId },
      {
        $setOnInsert: {
          issue: issueId,
          user: userId,
        },
        $set: {
          hidden: true,
          timestamp: now,
          phase,
          stage,
          reason,
        },
        $push: {
          history: historyEntry,
        },
      },
      { upsert: true, new: true }
    ),
    session
  );
};

/**
 * Obtiene un issue o lanza error si no existe.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<Object>}
 */
const getIssueOrThrow = async ({ issueId, session = null }) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const issue = await withOptionalSession(Issue.findById(issueId), session);

  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  return issue;
};

/**
 * Elimina en cascada todos los datos asociados a un issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<void>}
 */
export const deleteIssueCascade = async ({ issueId, session = null }) => {
  await Promise.all([
    withOptionalSession(Evaluation.deleteMany({ issue: issueId }), session),
    withOptionalSession(Alternative.deleteMany({ issue: issueId }), session),
    withOptionalSession(Criterion.deleteMany({ issue: issueId }), session),
    withOptionalSession(Participation.deleteMany({ issue: issueId }), session),
    withOptionalSession(Consensus.deleteMany({ issue: issueId }), session),
    withOptionalSession(Notification.deleteMany({ issue: issueId }), session),
    withOptionalSession(
      IssueExpressionDomain.deleteMany({ issue: issueId }),
      session
    ),
    withOptionalSession(
      CriteriaWeightEvaluation.deleteMany({ issue: issueId }),
      session
    ),
    withOptionalSession(ExitUserIssue.deleteMany({ issue: issueId }), session),
    withOptionalSession(IssueScenario.deleteMany({ issue: issueId }), session),
  ]);

  await withOptionalSession(Issue.deleteOne({ _id: issueId }), session);
};

/**
 * Elimina un issue activo si el usuario actual es su admin.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del usuario actual.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const deleteActiveIssueAsAdmin = async ({
  issueId,
  userId,
  session = null,
}) => {
  const issue = await getIssueOrThrow({ issueId, session });

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError("You are not the admin of this issue");
  }

  if (!issue.active) {
    throw createBadRequestError("Issue is not active and cannot be deleted");
  }

  const issueName = issue.name;

  await deleteIssueCascade({
    issueId: issue._id,
    session,
  });

  return { issueName };
};

/**
 * Obtiene los usuarios que pueden seguir viendo un issue finalizado.
 *
 * Incluye al admin del issue y a los expertos con invitación aceptada.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Documento del issue.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<string[]>}
 */
export const getFinishedIssueVisibleUserIds = async ({
  issue,
  session = null,
}) => {
  const acceptedParticipations = await withOptionalSession(
    Participation.find({
      issue: issue._id,
      invitationStatus: "accepted",
    })
      .select("expert")
      .lean(),
    session
  );

  return uniqueIdStrings([
    issue.admin,
    ...acceptedParticipations.map((participation) => participation.expert),
  ]);
};

/**
 * Oculta un issue finalizado para el usuario actual y elimina definitivamente
 * el issue si ya no queda ningún usuario con visibilidad sobre él.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del usuario actual.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const hideFinishedIssueForUserFlow = async ({
  issueId,
  userId,
  session = null,
}) => {
  const issue = await getIssueOrThrow({ issueId, session });

  if (issue.active) {
    throw createBadRequestError("Issue is still active");
  }

  const visibleUserIds = await getFinishedIssueVisibleUserIds({
    issue,
    session,
  });

  if (!visibleUserIds.includes(toIdString(userId))) {
    throw createForbiddenError(
      "You are not allowed to remove this finished issue"
    );
  }

  const currentPhase = await getNextConsensusPhase(issue._id);
  const stageForLog = mapIssueStageToExitStage(issue.currentStage);

  await registerUserExit({
    issueId: issue._id,
    userId,
    phase: currentPhase,
    stage: stageForLog,
    reason: "Issue finished and removed for user",
    session,
  });

  const hiddenExits = await withOptionalSession(
    ExitUserIssue.find({
      issue: issue._id,
      hidden: true,
      user: { $in: visibleUserIds },
    })
      .select("user")
      .lean(),
    session
  );

  const hiddenUserIds = uniqueIdStrings(
    hiddenExits.map((exitDoc) => exitDoc.user)
  );

  const allVisibleUsersHaveHidden =
    visibleUserIds.length > 0 &&
    visibleUserIds.every((visibleUserId) =>
      hiddenUserIds.includes(visibleUserId)
    );

  if (allVisibleUsersHaveHidden) {
    await deleteIssueCascade({
      issueId: issue._id,
      session,
    });
  }

  return {
    issueName: issue.name,
    deletedPermanently: allVisibleUsersHaveHidden,
  };
};

/**
 * Permite a un experto abandonar un issue activo.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.userId Id del usuario actual.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const leaveActiveIssueFlow = async ({
  issueId,
  userId,
  session = null,
}) => {
  const issue = await getIssueOrThrow({ issueId, session });

  if (!issue.active) {
    throw createBadRequestError("Issue is not active");
  }

  if (sameId(issue.admin, userId)) {
    throw createForbiddenError("An admin can not leave an issue");
  }

  const participation = await withOptionalSession(
    Participation.findOne({
      issue: issue._id,
      expert: userId,
    }),
    session
  );

  if (!participation) {
    throw createBadRequestError("You are not a participant of this issue");
  }

  await cleanupExpertDraftsOnExit({
    issueId: issue._id,
    expertId: userId,
    session,
  });

  await withOptionalSession(
    Participation.deleteOne({ _id: participation._id }),
    session
  );

  const currentPhase = await getNextConsensusPhase(issue._id);
  const stageForLog = mapIssueStageToExitStage(issue.currentStage);

  await registerUserExit({
    issueId: issue._id,
    userId,
    phase: currentPhase,
    stage: stageForLog,
    reason: "Left by user",
    session,
  });

  return {
    issueName: issue.name,
  };
};

/**
 * Elimina borradores no enviados de un experto al salir de un issue.
 *
 * @param {Object} params Datos de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string|Object} params.expertId Id del experto.
 * @param {Object|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<void>}
 */
export const cleanupExpertDraftsOnExit = async ({
  issueId,
  expertId,
  session = null,
}) => {
  await withOptionalSession(
    CriteriaWeightEvaluation.deleteMany({
      issue: issueId,
      expert: expertId,
      completed: false,
    }),
    session
  );

  const hasSubmittedSomething = await withOptionalSession(
    Evaluation.exists({
      issue: issueId,
      expert: expertId,
      $or: [
        { timestamp: { $ne: null } },
        { history: { $elemMatch: { timestamp: { $ne: null } } } },
      ],
    }),
    session
  );

  if (!hasSubmittedSomething) {
    await withOptionalSession(
      Evaluation.deleteMany({ issue: issueId, expert: expertId }),
      session
    );
  }
};
