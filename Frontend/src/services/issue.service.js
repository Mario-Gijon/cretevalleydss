import { authFetch } from "../utils/authFetch";
import { API, jsonRequest, requestJson } from "./service.utils.js";

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
 * Guarda borradores de evaluaciones.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {object} evaluations Evaluaciones a guardar.
 * @returns {Promise<object>}
 */
export const saveEvaluations = async (issueOrId, evaluations) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/evaluations/draft`,
    jsonRequest("POST", { evaluations }),
    "Error saving evaluations."
  );
};

/**
 * Obtiene las evaluaciones del usuario actual para un issue.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {Promise<object>}
 */
export const getEvaluations = async (issueOrId) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/evaluations`,
    { method: "GET" },
    "Error fetching evaluations."
  );
};

/**
 * Envía las evaluaciones del usuario actual.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {object} evaluations Evaluaciones a enviar.
 * @returns {Promise<object>}
 */
export const submitEvaluations = async (issueOrId, evaluations) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/evaluations/submit`,
    jsonRequest("POST", { evaluations }),
    "Error submitting evaluations."
  );
};

/**
 * Resuelve un issue.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {boolean} forceFinalize Fuerza finalización si aplica.
 * @returns {Promise<object>}
 */
export const resolveIssue = async (issueOrId, forceFinalize = false) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/resolve`,
    jsonRequest("POST", { forceFinalize }),
    "Error resolving issue."
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
 * Guarda un borrador de pesos BWM.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {object} bwmData Datos BWM.
 * @returns {Promise<object>}
 */
export const saveBwmWeights = async (issueOrId, bwmData) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/weights/bwm/draft`,
    jsonRequest("POST", { bwmData }),
    "Error saving BWM weights."
  );
};

/**
 * Obtiene los pesos BWM guardados del usuario actual.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {Promise<object>}
 */
export const getBwmWeights = async (issueOrId) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/weights/bwm`,
    { method: "GET" },
    "Error fetching BWM weights."
  );
};

/**
 * Envía los pesos BWM del usuario actual.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {object} bwmData Datos BWM.
 * @returns {Promise<object>}
 */
export const sendBwmWeights = async (issueOrId, bwmData) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/weights/bwm/submit`,
    jsonRequest("POST", { bwmData }),
    "Error sending BWM weights."
  );
};

/**
 * Guarda un borrador de pesos manuales.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {object} manualWeights Pesos manuales.
 * @returns {Promise<object>}
 */
export const saveManualWeights = async (issueOrId, manualWeights) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/weights/manual/draft`,
    jsonRequest("POST", { manualWeights }),
    "Error saving manual weights."
  );
};

/**
 * Envía los pesos manuales del usuario actual.
 *
 * @param {*} issueOrId Id o issue completo.
 * @param {object} manualWeights Pesos manuales.
 * @returns {Promise<object>}
 */
export const sendManualWeights = async (issueOrId, manualWeights) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/weights/manual/submit`,
    jsonRequest("POST", { manualWeights }),
    "Error sending manual weights."
  );
};

/**
 * Obtiene los pesos manuales guardados del usuario actual.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {Promise<object>}
 */
export const getManualWeights = async (issueOrId) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/weights/manual`,
    { method: "GET" },
    "Error fetching manual weights."
  );
};

/**
 * Calcula los pesos BWM colectivos.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {Promise<object>}
 */
export const computeWeights = async (issueOrId) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/weights/bwm/compute`,
    { method: "POST" },
    "Error computing weights."
  );
};

/**
 * Calcula los pesos manuales colectivos.
 *
 * @param {*} issueOrId Id o issue completo.
 * @returns {Promise<object>}
 */
export const computeManualWeights = async (issueOrId) => {
  const issueId = getIssueId(issueOrId);

  return requestWithAuth(
    `/issues/${issueId}/weights/manual/compute`,
    { method: "POST" },
    "Error computing manual weights."
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
  targetModelName,
  targetModelId,
  paramOverrides,
}) => {
  const normalizedIssueId = getIssueId(issueId);

  return requestWithAuth(
    `/issues/${normalizedIssueId}/scenarios`,
    jsonRequest("POST", {
      scenarioName,
      targetModelName,
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