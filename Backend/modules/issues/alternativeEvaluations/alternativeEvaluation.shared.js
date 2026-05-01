import { Alternative } from "../../../models/Alternatives.js";
import { Consensus } from "../../../models/Consensus.js";
import { Criterion } from "../../../models/Criteria.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { Participation } from "../../../models/Participations.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

import {
  getAcceptedParticipation,
  getDefaultIssueSnapshot,
  getNextConsensusPhase,
} from "../issue.queries.js";

/**
 * Crea un error estándar de validación para payloads de evaluaciones.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.validation Resultado de validación.
 * @param {string} [params.fallbackMessage="Invalid evaluations"] Mensaje por defecto.
 * @param {Object|null} [params.details=null] Detalles del error por estructura.
 * @returns {Error}
 */
export const createEvaluationValidationError = ({
  validation,
  fallbackMessage = "Invalid evaluations",
  details = null,
}) => {
  return createBadRequestError(
    validation?.error?.message || fallbackMessage,
    {
      field: "evaluations",
      details,
    }
  );
};

/**
 * Construye un mapa nombre -> id a partir de una colección de documentos.
 *
 * @param {Array<Object>} docs Documentos con campos name y _id.
 * @returns {Map<string, string>}
 */
const buildNameIdMap = (docs = []) =>
  new Map(
    docs.map((doc) => [doc.name, toIdString(doc._id)]).filter(([, id]) =>
      Boolean(id)
    )
  );

/**
 * Carga y valida el contexto base necesario para guardar evaluaciones.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue cargado.
 * @param {string} params.userId Id del usuario actual.
 * @param {boolean} [params.requireDefaultSnapshot=false] Indica si debe existir un snapshot por defecto.
 * @returns {Promise<Object>}
 */
export const getEvaluationSaveContext = async ({
  issue,
  userId,
  requireDefaultSnapshot = false,
}) => {
  const issueDoc = issue;
  const issueId = toIdString(issueDoc?._id);

  if (!issueId) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const [participation, alternatives, criteria, currentPhase, defaultSnapshot] =
    await Promise.all([
      getAcceptedParticipation(issueId, userId),
      Alternative.find({ issue: issueId }).sort({ name: 1 }).lean(),
      Criterion.find({ issue: issueId }).select("_id name").lean(),
      getNextConsensusPhase(issueId),
      requireDefaultSnapshot
        ? getDefaultIssueSnapshot(issueId)
        : Promise.resolve(null),
    ]);

  if (!participation) {
    throw createForbiddenError("You are no longer a participant in this issue");
  }

  if (requireDefaultSnapshot && !defaultSnapshot) {
    throw createBadRequestError(
      "This issue has no IssueExpressionDomain snapshots."
    );
  }

  return {
    issue: issueDoc,
    issueId,
    currentPhase,
    defaultSnapshot,
    alternativeMap: buildNameIdMap(alternatives),
    criterionMap: buildNameIdMap(criteria),
  };
};

/**
 * Verifica que todos los snapshots indicados pertenezcan al issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string[]} params.snapshotIds Ids de snapshots a validar.
 * @returns {Promise<void>}
 */
export const ensureIssueSnapshotIdsExist = async ({
  issueId,
  snapshotIds,
}) => {
  if (!Array.isArray(snapshotIds) || snapshotIds.length === 0) {
    return;
  }

  const normalizedSnapshotIds = snapshotIds.map(toIdString).filter(Boolean);

  if (normalizedSnapshotIds.length === 0) {
    return;
  }

  const count = await IssueExpressionDomain.countDocuments({
    _id: { $in: normalizedSnapshotIds },
    issue: issueId,
  });

  if (count !== normalizedSnapshotIds.length) {
    throw createBadRequestError(
      "Invalid expressionDomain snapshot for this issue"
    );
  }
};

/**
 * Carga y valida el contexto base necesario para leer evaluaciones.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issue Issue cargado.
 * @param {string} params.userId Id del usuario actual.
 * @returns {Promise<Object>}
 */
export const getEvaluationReadContext = async ({
  issue,
  userId,
}) => {
  const issueDoc = issue;
  const issueId = toIdString(issueDoc?._id);

  if (!issueId) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const [participation, latestConsensus, currentPhase] = await Promise.all([
    getAcceptedParticipation(issueId, userId),
    Consensus.findOne({ issue: issueId }).sort({ phase: -1 }).lean(),
    getNextConsensusPhase(issueId),
  ]);

  if (!participation) {
    throw createForbiddenError("You are no longer a participant in this issue");
  }

  return {
    issue: issueDoc,
    issueId,
    latestConsensus,
    currentPhase,
  };
};

/**
 * Marca la participación del experto como evaluación completada.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.userId Id del experto.
 * @returns {Promise<void>}
 */
export const markParticipationEvaluationCompletedOrThrow = async ({
  issueId,
  userId,
}) => {
  const participation = await Participation.findOneAndUpdate(
    {
      issue: issueId,
      expert: userId,
      invitationStatus: "accepted",
    },
    { $set: { evaluationCompleted: true } },
    { new: true }
  );

  if (!participation) {
    throw createNotFoundError("Participation not found");
  }
};

const hasMoreThanTwoDecimals = (value) => {
  const numericValue = Number(value);
  return numericValue !== Math.round(numericValue * 100) / 100;
};

const isStepAligned = ({ value, min, step }) => {
  if (!Number.isFinite(step) || step <= 0) return true;

  const stepsFromMin = (value - min) / step;
  return Math.abs(stepsFromMin - Math.round(stepsFromMin)) < 1e-9;
};

export const validateEvaluationCellByDomain = ({ value, domain, locationLabel }) => {
  if (domain?.type === "numeric") {
    const min = domain.range?.min ?? 0;
    const max = domain.range?.max ?? 1;
    const step = Number(domain?.range?.step);
    const numericValue = parseFloat(value);

    if (isNaN(numericValue) || numericValue < min || numericValue > max) {
      return {
        valid: false,
        message: `Invalid value for ${locationLabel}. Must be between ${min} and ${max}.`,
      };
    }

    if (hasMoreThanTwoDecimals(numericValue)) {
      return {
        valid: false,
        message: `Value for ${locationLabel} must have at most two decimals.`,
      };
    }

    if (!isStepAligned({ value: numericValue, min, step })) {
      return {
        valid: false,
        message: `Value for ${locationLabel} must follow step ${step}.`,
      };
    }
  }

  if (domain?.type === "linguistic") {
    const validLabels = domain.labels?.map((label) => label.label) || [];

    if (!validLabels.includes(value)) {
      return {
        valid: false,
        message: `Invalid label for ${locationLabel}. Must be one of: ${validLabels.join(", ")}.`,
      };
    }
  }

  return { valid: true };
};

export const getEvaluationCellDomain = (cell) => {
  if (cell && typeof cell === "object" && "domain" in cell) {
    return cell.domain;
  }

  return null;
};

export const isEmptyEvaluationValue = (value) =>
  value === "" || value === null || value === undefined;

export const getEvaluationCellValue = (cell) => {
  if (cell && typeof cell === "object" && "value" in cell) {
    return cell.value;
  }

  return cell;
};
