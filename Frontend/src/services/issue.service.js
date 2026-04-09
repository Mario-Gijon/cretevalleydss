import { authFetch } from "../utils/authFetch";
import { API, jsonRequest, safeJson } from "./service.utils.js";

/**
 * Normaliza el id de un issue recibido como string o como objeto.
 *
 * @param {*} issueOrId
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
 * Obtiene el catálogo de modelos disponibles.
 *
 * @returns {Promise<any[]|false>}
 */
export const getModelsInfo = async () => {
  try {
    const response = await authFetch(`${API}/issues/models`, { method: "GET" });
    const data = await safeJson(response);

    return data?.success ? data.data : false;
  } catch (error) {
    console.error("Error fetching models info:", error);
    return false;
  }
};

/**
 * Obtiene los usuarios disponibles para crear o editar issues.
 *
 * @returns {Promise<any[]|false>}
 */
export const getAllUsers = async () => {
  try {
    const response = await authFetch(`${API}/issues/users`, { method: "GET" });
    const data = await safeJson(response);

    return data?.success ? data.data : false;
  } catch (error) {
    console.error("Error fetching users:", error);
    return false;
  }
};

/**
 * Obtiene los dominios de expresión visibles para el usuario actual.
 *
 * @returns {Promise<any[]|false>}
 */
export const getExpressionsDomain = async () => {
  try {
    const response = await authFetch(`${API}/issues/expression-domains`, {
      method: "GET",
    });

    const data = await safeJson(response);

    return data?.success ? data.data : [];
  } catch (error) {
    console.error("Error fetching expressions domain:", error);
    return false;
  }
};

/**
 * Crea un nuevo dominio de expresión.
 *
 * @param {object} domain
 * @returns {Promise<object|false>}
 */
export const createExpressionDomain = async (domain) => {
  try {
    const response = await authFetch(
      `${API}/issues/expression-domains`,
      jsonRequest("POST", domain)
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error creating domain:", error);
    return false;
  }
};

/**
 * Elimina un dominio de expresión.
 *
 * @param {string} id
 * @returns {Promise<object|false>}
 */
export const removeExpressionDomain = async (id) => {
  try {
    const response = await authFetch(`${API}/issues/expression-domains/${id}`, {
      method: "DELETE",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error deleting domain:", error);
    return false;
  }
};

/**
 * Actualiza un dominio de expresión.
 *
 * @param {string} id
 * @param {object} updatedDomain
 * @returns {Promise<object|false>}
 */
export const updateExpressionDomain = async (id, updatedDomain) => {
  try {
    const response = await authFetch(
      `${API}/issues/expression-domains/${id}`,
      jsonRequest("PATCH", { updatedDomain })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error updating domain:", error);
    return false;
  }
};

/**
 * Crea un nuevo issue.
 *
 * @param {object} issueInfo
 * @returns {Promise<object|false>}
 */
export const createIssue = async (issueInfo) => {
  try {
    const response = await authFetch(
      `${API}/issues`,
      jsonRequest("POST", { issueInfo })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error creating issue:", error);
    return false;
  }
};

/**
 * Obtiene los issues activos visibles para el usuario actual.
 *
 * @returns {Promise<object|false>}
 */
export const getAllActiveIssues = async () => {
  try {
    const response = await authFetch(`${API}/issues/active`, {
      method: "GET",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching active issues:", error);
    return false;
  }
};

/**
 * Obtiene los issues finalizados visibles para el usuario actual.
 *
 * @returns {Promise<object|false>}
 */
export const getAllFinishedIssues = async () => {
  try {
    const response = await authFetch(`${API}/issues/finished`, {
      method: "GET",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching finished issues:", error);
    return false;
  }
};

/**
 * Elimina un issue activo.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const removeIssue = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(`${API}/issues/${issueId}`, {
      method: "DELETE",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error removing issue:", error);
    return false;
  }
};

/**
 * Acepta o rechaza una invitación a un issue.
 *
 * @param {*} issueOrId
 * @param {"accepted"|"declined"} action
 * @returns {Promise<object|false>}
 */
export const changeInvitationStatus = async (issueOrId, action) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/invitation-response`,
      jsonRequest("POST", { action })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error changing invitation status:", error);
    return false;
  }
};

/**
 * Guarda borradores de evaluaciones.
 *
 * @param {*} issueOrId
 * @param {object} evaluations
 * @returns {Promise<object|false>}
 */
export const saveEvaluations = async (issueOrId, evaluations) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/evaluations/draft`,
      jsonRequest("POST", { evaluations })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error saving evaluations:", error);
    return false;
  }
};

/**
 * Obtiene las evaluaciones del usuario actual para un issue.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const getEvaluations = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(`${API}/issues/${issueId}/evaluations`, {
      method: "GET",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return false;
  }
};

/**
 * Envía las evaluaciones del usuario actual.
 *
 * @param {*} issueOrId
 * @param {object} evaluations
 * @returns {Promise<object|false>}
 */
export const submitEvaluations = async (issueOrId, evaluations) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/evaluations/submit`,
      jsonRequest("POST", { evaluations })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error submitting evaluations:", error);
    return false;
  }
};

/**
 * Resuelve un issue.
 *
 * @param {*} issueOrId
 * @param {boolean} forceFinalize
 * @returns {Promise<object|false>}
 */
export const resolveIssue = async (issueOrId, forceFinalize = false) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/resolve`,
      jsonRequest("POST", { forceFinalize })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error resolving issue:", error);
    return false;
  }
};

/**
 * Obtiene el detalle de un issue finalizado.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const getFinishedIssueInfo = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(`${API}/issues/finished/${issueId}`, {
      method: "GET",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching finished issue info:", error);
    return false;
  }
};

/**
 * Oculta o elimina un issue finalizado para el usuario actual.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const removeFinishedIssue = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(`${API}/issues/finished/${issueId}`, {
      method: "DELETE",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error removing finished issue:", error);
    return false;
  }
};

/**
 * Edita los expertos de un issue.
 *
 * @param {*} issueOrId
 * @param {string[]} expertsToAdd
 * @param {string[]} expertsToRemove
 * @param {object|null} domainAssignments
 * @returns {Promise<object|false>}
 */
export const editExperts = async (
  issueOrId,
  expertsToAdd,
  expertsToRemove,
  domainAssignments = null
) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/experts`,
      jsonRequest("PATCH", {
        expertsToAdd,
        expertsToRemove,
        domainAssignments,
      })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error editing experts:", error);
    return false;
  }
};

/**
 * Permite al usuario actual abandonar un issue activo.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const leaveIssue = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(`${API}/issues/${issueId}/leave`, {
      method: "POST",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error leaving issue:", error);
    return false;
  }
};

/**
 * Guarda un borrador de pesos BWM.
 *
 * @param {*} issueOrId
 * @param {object} bwmData
 * @returns {Promise<object|false>}
 */
export const saveBwmWeights = async (issueOrId, bwmData) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/weights/bwm/draft`,
      jsonRequest("POST", { bwmData })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error saving BWM weights:", error);
    return false;
  }
};

/**
 * Obtiene los pesos BWM guardados del usuario actual.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const getBwmWeights = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(`${API}/issues/${issueId}/weights/bwm`, {
      method: "GET",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching BWM weights:", error);
    return false;
  }
};

/**
 * Envía los pesos BWM del usuario actual.
 *
 * @param {*} issueOrId
 * @param {object} bwmData
 * @returns {Promise<object|false>}
 */
export const sendBwmWeights = async (issueOrId, bwmData) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/weights/bwm/submit`,
      jsonRequest("POST", { bwmData })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error sending BWM weights:", error);
    return false;
  }
};

/**
 * Guarda un borrador de pesos manuales.
 *
 * @param {*} issueOrId
 * @param {object} manualWeights
 * @returns {Promise<object|false>}
 */
export const saveManualWeights = async (issueOrId, manualWeights) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/weights/manual/draft`,
      jsonRequest("POST", { manualWeights })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error saving manual weights:", error);
    return false;
  }
};

/**
 * Envía los pesos manuales del usuario actual.
 *
 * @param {*} issueOrId
 * @param {object} manualWeights
 * @returns {Promise<object|false>}
 */
export const sendManualWeights = async (issueOrId, manualWeights) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/weights/manual/submit`,
      jsonRequest("POST", { manualWeights })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error sending manual weights:", error);
    return false;
  }
};

/**
 * Obtiene los pesos manuales guardados del usuario actual.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const getManualWeights = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(`${API}/issues/${issueId}/weights/manual`, {
      method: "GET",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching manual weights:", error);
    return false;
  }
};

/**
 * Calcula los pesos BWM colectivos.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const computeWeights = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/weights/bwm/compute`,
      {
        method: "POST",
      }
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error computing weights:", error);
    return false;
  }
};

/**
 * Calcula los pesos manuales colectivos.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const computeManualWeights = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(
      `${API}/issues/${issueId}/weights/manual/compute`,
      {
        method: "POST",
      }
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error computing manual weights:", error);
    return false;
  }
};

/**
 * Lista los escenarios de un issue.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const getIssueScenarios = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const response = await authFetch(`${API}/issues/${issueId}/scenarios`, {
      method: "GET",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching scenarios:", error);
    return false;
  }
};

/**
 * Obtiene un escenario por su id.
 *
 * @param {string} scenarioId
 * @returns {Promise<object|false>}
 */
export const getIssueScenarioById = async (scenarioId) => {
  try {
    const response = await authFetch(`${API}/issues/scenarios/${scenarioId}`, {
      method: "GET",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error fetching scenario by id:", error);
    return false;
  }
};

/**
 * Crea un escenario de simulación para un issue.
 *
 * @param {object} params
 * @returns {Promise<object|false>}
 */
export const createIssueScenario = async ({
  issueId,
  scenarioName,
  targetModelName,
  targetModelId,
  paramOverrides,
}) => {
  try {
    const normalizedIssueId = getIssueId(issueId);

    const response = await authFetch(
      `${API}/issues/${normalizedIssueId}/scenarios`,
      jsonRequest("POST", {
        scenarioName,
        targetModelName,
        targetModelId,
        paramOverrides,
      })
    );

    return await safeJson(response);
  } catch (error) {
    console.error("Error creating scenario:", error);
    return false;
  }
};

/**
 * Elimina un escenario por su id.
 *
 * @param {string} scenarioId
 * @returns {Promise<object|false>}
 */
export const removeIssueScenario = async (scenarioId) => {
  try {
    const response = await authFetch(`${API}/issues/scenarios/${scenarioId}`, {
      method: "DELETE",
    });

    return await safeJson(response);
  } catch (error) {
    console.error("Error removing scenario:", error);
    return false;
  }
};