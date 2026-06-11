import { authFetch } from "../utils/authFetch";
import { API, jsonRequest, requestJson } from "./httpRequest.service.js";

/**
 * Normaliza el id de un issue recibido como string o como objeto.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {string|null}
 */
const getIssueId = (issueOrId) => {
  if (!issueOrId) {
    return null;
  }

  if (typeof issueOrId === "string") {
    return issueOrId;
  }

  if (typeof issueOrId === "object") {
    return issueOrId.id || issueOrId._id || null;
  }

  return null;
};

/**
 * Ejecuta una petición autenticada y devuelve siempre una respuesta normalizada.
 *
 * @param {string} path Ruta relativa a la API.
 * @param {object} options Opciones fetch.
 * @param {string} fallbackMessage Mensaje por defecto si falla la petición.
 * @returns {Promise<object>}
 */
const requestWithAuth = (path, options, fallbackMessage) =>
  requestJson(`${API}${path}`, options, {
    fetcher: authFetch,
    fallbackMessage,
  });

/**
 * Obtiene el catálogo de modelos disponibles.
 *
 * @returns {Promise<object>}
 */
export const getModelsInfo = async () =>
  requestWithAuth(
    "/issues/models",
    { method: "GET" },
    "Error fetching models info."
  );

/**
 * Obtiene los usuarios disponibles para crear o editar issues.
 *
 * @returns {Promise<object>}
 */
export const getAllUsers = async () =>
  requestWithAuth("/issues/users", { method: "GET" }, "Error fetching users.");

/**
 * Obtiene los dominios de expresión visibles para el usuario actual.
 *
 * @returns {Promise<object>}
 */
export const getExpressionsDomain = async () =>
  requestWithAuth(
    "/issues/expression-domains",
    { method: "GET" },
    "Error fetching expressions domain."
  );

/**
 * Crea un nuevo dominio de expresión.
 *
 * @param {object} domain Datos del dominio.
 * @returns {Promise<object>}
 */
export const createExpressionDomain = async (domain) =>
  requestWithAuth(
    "/issues/expression-domains",
    jsonRequest("POST", domain),
    "Error creating domain."
  );

/**
 * Elimina un dominio de expresión.
 *
 * @param {string} id Id del dominio.
 * @returns {Promise<object>}
 */
export const removeExpressionDomain = async (id) =>
  requestWithAuth(
    `/issues/expression-domains/${id}`,
    { method: "DELETE" },
    "Error deleting domain."
  );

/**
 * Actualiza un dominio de expresión.
 *
 * @param {string} id Id del dominio.
 * @param {object} updatedDomain Datos actualizados.
 * @returns {Promise<object>}
 */
export const updateExpressionDomain = async (id, updatedDomain) =>
  requestWithAuth(
    `/issues/expression-domains/${id}`,
    jsonRequest("PATCH", { updatedDomain }),
    "Error updating domain."
  );

/**
 * Crea un nuevo issue.
 *
 * @param {object} issueInfo Datos del issue.
 * @returns {Promise<object>}
 */
export const createIssue = async (issueInfo) =>
  requestWithAuth(
    "/issues",
    jsonRequest("POST", { issueInfo }),
    "Error creating issue."
  );

/**
 * Obtiene los issues activos visibles para el usuario actual.
 *
 * @returns {Promise<object>}
 */
export const getAllActiveIssues = async () =>
  requestWithAuth(
    "/issues/active",
    { method: "GET" },
    "Error fetching active issues."
  );

/**
 * Obtiene los issues finalizados visibles para el usuario actual.
 *
 * @returns {Promise<object>}
 */
export const getAllFinishedIssues = async () =>
  requestWithAuth(
    "/issues/finished",
    { method: "GET" },
    "Error fetching finished issues."
  );

/**
 * Elimina un issue activo.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {Promise<object>}
 */
export const removeIssue = async (issueOrId) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}`,
    { method: "DELETE" },
    "Error removing issue."
  );
};

/**
 * Acepta o rechaza una invitación a un issue.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {"accepted"|"declined"} action Acción a aplicar.
 * @returns {Promise<object>}
 */
export const changeInvitationStatus = async (issueOrId, action) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/invitation-response`,
    jsonRequest("POST", { action }),
    "Error changing invitation status."
  );
};

/**
 * Obtiene la evaluación del usuario actual para una etapa.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {string} stage Etapa canónica de evaluación.
 * @returns {Promise<object>}
 */
export const getIssueEvaluation = async (issueOrId, stage) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/evaluations/${stage}`,
    { method: "GET" },
    "Error fetching issue evaluation."
  );
};

/**
 * Guarda borrador de evaluación del usuario actual para una etapa.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {string} stage Etapa canónica de evaluación.
 * @param {object} payload Payload canónico de la estructura.
 * @returns {Promise<object>}
 */
export const saveIssueEvaluationDraft = async (issueOrId, stage, payload) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/evaluations/${stage}/send`,
    jsonRequest("POST", { payload }),
    "Error saving issue evaluation draft."
  );
};

/**
 * Envía evaluación del usuario actual para una etapa.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {string} stage Etapa canónica de evaluación.
 * @param {object} payload Payload canónico de la estructura.
 * @returns {Promise<object>}
 */
export const submitIssueEvaluation = async (issueOrId, stage, payload) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/evaluations/${stage}/submit`,
    jsonRequest("POST", { payload }),
    "Error submitting issue evaluation."
  );
};

/**
 * Obtiene el detalle de un issue finalizado.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {Promise<object>}
 */
export const getFinishedIssueInfo = async (issueOrId) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/finished/${issueId}`,
    { method: "GET" },
    "Error fetching finished issue info."
  );
};

/**
 * Oculta o elimina un issue finalizado para el usuario actual.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {Promise<object>}
 */
export const removeFinishedIssue = async (issueOrId) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/finished/${issueId}`,
    { method: "DELETE" },
    "Error removing finished issue."
  );
};

/**
 * Edita los expertos de un issue.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {string[]} expertsToAdd Expertos a añadir.
 * @param {string[]} expertsToRemove Expertos a eliminar.
 * @param {object|null} domainAssignments Asignaciones de dominios.
 * @returns {Promise<object>}
 */
export const editExperts = async (
  issueOrId,
  expertsToAdd,
  expertsToRemove,
  domainAssignments = null
) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/experts`,
    jsonRequest("PATCH", {
      expertsToAdd,
      expertsToRemove,
      domainAssignments,
    }),
    "Error editing experts."
  );
};

/**
 * Permite al usuario actual abandonar un issue activo.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {Promise<object>}
 */
export const leaveIssue = async (issueOrId) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/leave`,
    { method: "POST" },
    "Error leaving issue."
  );
};

/**
 * Ejecuta el cómputo de una etapa de evaluación.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {string} stage Etapa de evaluación.
 * @returns {Promise<object>}
 */
export const computeEvaluationStage = async (issueOrId, stage) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/evaluations/${stage}/compute`,
    { method: "POST" },
    "Error computing evaluation stage."
  );
};

/**
 * Lista los escenarios de un issue.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {Promise<object>}
 */
export const getIssueScenarios = async (issueOrId) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/scenarios`,
    { method: "GET" },
    "Error fetching scenarios."
  );
};

/**
 * Obtiene un escenario por su id.
 *
 * @param {string} scenarioId Id del escenario.
 * @returns {Promise<object>}
 */
export const getIssueScenarioById = async (scenarioId) =>
  requestWithAuth(
    `/issues/scenarios/${scenarioId}`,
    { method: "GET" },
    "Error fetching scenario by id."
  );

/**
 * Crea un escenario de simulación para un issue.
 *
 * @param {object} params Datos del escenario.
 * @returns {Promise<object>}
 */
export const createIssueScenario = async ({
  issueId,
  scenarioName,
  targetModelId,
  paramOverrides,
}) => {
  const normalizedIssueId = getIssueId(issueId);

  return requestWithAuth(
    `/issues/${normalizedIssueId}/scenarios`,
    jsonRequest("POST", {
      scenarioName,
      targetModelId,
      paramOverrides,
    }),
    "Error creating scenario."
  );
};

/**
 * Elimina un escenario por su id.
 *
 * @param {string} scenarioId Id del escenario.
 * @returns {Promise<object>}
 */
export const removeIssueScenario = async (scenarioId) =>
  requestWithAuth(
    `/issues/scenarios/${scenarioId}`,
    { method: "DELETE" },
    "Error removing scenario."
  );
