import { authFetch } from "../utils/authFetch";

const API = import.meta.env.VITE_API_BACK;

/**
 * Intenta parsear una respuesta JSON sin lanzar excepción si no hay body.
 *
 * @param {Response} res Respuesta de fetch.
 * @returns {Promise<any|null>}
 */
const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

/**
 * Normaliza el id de un issue recibido como string o como objeto.
 *
 * @param {string|Record<string, any>|null|undefined} issueOrId Issue o id.
 * @returns {string|null}
 */
const getIssueId = (issueOrId) => {
  if (!issueOrId) return null;

  if (typeof issueOrId === "string") return issueOrId;

  if (typeof issueOrId === "object") {
    return issueOrId.id || issueOrId._id || null;
  }

  return null;
};

/**
 * Construye una petición JSON.
 *
 * @param {"POST"|"PATCH"|"PUT"} method Método HTTP.
 * @param {Record<string, any>} body Body de la petición.
 * @returns {RequestInit}
 */
const jsonRequest = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * Obtiene el catálogo de modelos disponibles.
 *
 * @returns {Promise<any[]|false>}
 */
export const getModelsInfo = async () => {
  try {
    const res = await authFetch(`${API}/issues/models`, { method: "GET" });
    const jsonData = await safeJson(res);
    return jsonData?.success ? jsonData.data : false;
  } catch (err) {
    console.error("Error fetching models info:", err);
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
    const res = await authFetch(`${API}/issues/users`, { method: "GET" });
    const jsonData = await safeJson(res);
    return jsonData?.success ? jsonData.data : false;
  } catch (err) {
    console.error("Error fetching users:", err);
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
    const res = await authFetch(`${API}/issues/expression-domains`, {
      method: "GET",
    });
    const jsonData = await safeJson(res);
    return jsonData?.success ? jsonData.data : [];
  } catch (err) {
    console.error("Error fetching expressions domain:", err);
    return false;
  }
};

/**
 * Crea un nuevo dominio de expresión.
 *
 * @param {Record<string, any>} domain Datos del dominio.
 * @returns {Promise<Record<string, any>|false>}
 */
export const createExpressionDomain = async (domain) => {
  try {
    const res = await authFetch(
      `${API}/issues/expression-domains`,
      jsonRequest("POST", domain)
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error creating domain:", err);
    return false;
  }
};

/**
 * Elimina un dominio de expresión.
 *
 * @param {string} id Id del dominio.
 * @returns {Promise<Record<string, any>|false>}
 */
export const removeExpressionDomain = async (id) => {
  try {
    const res = await authFetch(`${API}/issues/expression-domains/${id}`, {
      method: "DELETE",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error deleting domain:", err);
    return false;
  }
};

/**
 * Actualiza un dominio de expresión.
 *
 * @param {string} id Id del dominio.
 * @param {Record<string, any>} updatedDomain Datos actualizados.
 * @returns {Promise<Record<string, any>|false>}
 */
export const updateExpressionDomain = async (id, updatedDomain) => {
  try {
    const res = await authFetch(
      `${API}/issues/expression-domains/${id}`,
      jsonRequest("PATCH", { updatedDomain })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error updating domain:", err);
    return false;
  }
};

/**
 * Crea un nuevo issue.
 *
 * @param {Record<string, any>} issueInfo Datos del issue.
 * @returns {Promise<Record<string, any>|false>}
 */
export const createIssue = async (issueInfo) => {
  try {
    const res = await authFetch(
      `${API}/issues`,
      jsonRequest("POST", { issueInfo })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error creating issue:", err);
    return false;
  }
};

/**
 * Obtiene los issues activos visibles para el usuario actual.
 *
 * @returns {Promise<Record<string, any>|false>}
 */
export const getAllActiveIssues = async () => {
  try {
    const res = await authFetch(`${API}/issues/active`, { method: "GET" });
    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching active issues:", err);
    return false;
  }
};

/**
 * Obtiene los issues finalizados visibles para el usuario actual.
 *
 * @returns {Promise<Record<string, any>|false>}
 */
export const getAllFinishedIssues = async () => {
  try {
    const res = await authFetch(`${API}/issues/finished`, { method: "GET" });
    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching finished issues:", err);
    return false;
  }
};

/**
 * Elimina un issue activo.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @returns {Promise<Record<string, any>|false>}
 */
export const removeIssue = async (issueOrId) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(`${API}/issues/${id}`, {
      method: "DELETE",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error removing issue:", err);
    return false;
  }
};

/**
 * Acepta o rechaza una invitación a un issue.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @param {"accepted"|"declined"} action Acción sobre la invitación.
 * @returns {Promise<Record<string, any>|false>}
 */
export const changeInvitationStatus = async (issueOrId, action) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(
      `${API}/issues/${id}/invitation-response`,
      jsonRequest("POST", { action })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error changing invitation status:", err);
    return false;
  }
};

/**
 * Guarda borradores de evaluaciones.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @param {Record<string, any>} evaluations Evaluaciones.
 * @returns {Promise<Record<string, any>|false>}
 */
export const saveEvaluations = async (issueOrId, evaluations) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(
      `${API}/issues/${id}/evaluations/draft`,
      jsonRequest("POST", { evaluations })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error saving evaluations:", err);
    return false;
  }
};

/**
 * Obtiene las evaluaciones del usuario actual para un issue.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getEvaluations = async (issueOrId) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(`${API}/issues/${id}/evaluations`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching evaluations:", err);
    return false;
  }
};

/**
 * Envía las evaluaciones del usuario actual.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @param {Record<string, any>} evaluations Evaluaciones.
 * @returns {Promise<Record<string, any>|false>}
 */
export const submitEvaluations = async (issueOrId, evaluations) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(
      `${API}/issues/${id}/evaluations/submit`,
      jsonRequest("POST", { evaluations })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error submitting evaluations:", err);
    return false;
  }
};

/**
 * Resuelve un issue.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @param {boolean} [forceFinalize=false] Fuerza la finalización si aplica.
 * @returns {Promise<Record<string, any>|false>}
 */
export const resolveIssue = async (issueOrId, forceFinalize = false) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(
      `${API}/issues/${id}/resolve`,
      jsonRequest("POST", { forceFinalize })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error resolving issue:", err);
    return false;
  }
};

/**
 * Obtiene el detalle de un issue finalizado.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getFinishedIssueInfo = async (issueOrId) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(`${API}/issues/finished/${id}`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching finished issue info:", err);
    return false;
  }
};

/**
 * Oculta o elimina un issue finalizado para el usuario actual.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @returns {Promise<Record<string, any>|false>}
 */
export const removeFinishedIssue = async (issueOrId) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(`${API}/issues/finished/${id}`, {
      method: "DELETE",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error removing finished issue:", err);
    return false;
  }
};

/**
 * Edita los expertos de un issue.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @param {string[]} expertsToAdd Correos a añadir.
 * @param {string[]} expertsToRemove Correos a eliminar.
 * @param {Record<string, any>|null} [domainAssignments=null] Asignaciones de dominios.
 * @returns {Promise<Record<string, any>|false>}
 */
export const editExperts = async (
  issueOrId,
  expertsToAdd,
  expertsToRemove,
  domainAssignments = null
) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(
      `${API}/issues/${id}/experts`,
      jsonRequest("PATCH", {
        expertsToAdd,
        expertsToRemove,
        domainAssignments,
      })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error editing experts:", err);
    return false;
  }
};

/**
 * Permite al usuario actual abandonar un issue activo.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @returns {Promise<Record<string, any>|false>}
 */
export const leaveIssue = async (issueOrId) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(`${API}/issues/${id}/leave`, {
      method: "POST",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error leaving issue:", err);
    return false;
  }
};

/**
 * Guarda un borrador de pesos BWM.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @param {Record<string, any>} bwmData Datos BWM.
 * @returns {Promise<Record<string, any>|false>}
 */
export const saveBwmWeights = async (issueOrId, bwmData) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(
      `${API}/issues/${id}/weights/bwm/draft`,
      jsonRequest("POST", { bwmData })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error saving BWM weights:", err);
    return false;
  }
};

/**
 * Obtiene los pesos BWM guardados del usuario actual.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getBwmWeights = async (issueOrId) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(`${API}/issues/${id}/weights/bwm`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching BWM weights:", err);
    return false;
  }
};

/**
 * Envía los pesos BWM del usuario actual.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @param {Record<string, any>} bwmData Datos BWM.
 * @returns {Promise<Record<string, any>|false>}
 */
export const sendBwmWeights = async (issueOrId, bwmData) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(
      `${API}/issues/${id}/weights/bwm/submit`,
      jsonRequest("POST", { bwmData })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error sending BWM weights:", err);
    return false;
  }
};

/**
 * Guarda un borrador de pesos manuales.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @param {Record<string, any>} manualWeights Pesos manuales.
 * @returns {Promise<Record<string, any>|false>}
 */
export const saveManualWeights = async (issueOrId, manualWeights) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(
      `${API}/issues/${id}/weights/manual/draft`,
      jsonRequest("POST", { manualWeights })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error saving manual weights:", err);
    return false;
  }
};

/**
 * Envía los pesos manuales del usuario actual.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @param {Record<string, any>} manualWeights Pesos manuales.
 * @returns {Promise<Record<string, any>|false>}
 */
export const sendManualWeights = async (issueOrId, manualWeights) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(
      `${API}/issues/${id}/weights/manual/submit`,
      jsonRequest("POST", { manualWeights })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error sending manual weights:", err);
    return false;
  }
};

/**
 * Obtiene los pesos manuales guardados del usuario actual.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getManualWeights = async (issueOrId) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(`${API}/issues/${id}/weights/manual`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching manual weights:", err);
    return false;
  }
};

/**
 * Calcula los pesos BWM colectivos.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @returns {Promise<Record<string, any>|false>}
 */
export const computeWeights = async (issueOrId) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(`${API}/issues/${id}/weights/bwm/compute`, {
      method: "POST",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error computing weights:", err);
    return false;
  }
};

/**
 * Calcula los pesos manuales colectivos.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @returns {Promise<Record<string, any>|false>}
 */
export const computeManualWeights = async (issueOrId) => {
  try {
    const id = getIssueId(issueOrId);

    const res = await authFetch(`${API}/issues/${id}/weights/manual/compute`, {
      method: "POST",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error computing manual weights:", err);
    return false;
  }
};

/**
 * Lista los escenarios de un issue.
 *
 * @param {string|Record<string, any>} issueOrId Issue o id.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getIssueScenarios = async (issueOrId) => {
  try {
    const issueId = getIssueId(issueOrId);

    const res = await authFetch(`${API}/issues/${issueId}/scenarios`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching scenarios:", err);
    return false;
  }
};

/**
 * Obtiene un escenario por su id.
 *
 * @param {string} scenarioId Id del escenario.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getIssueScenarioById = async (scenarioId) => {
  try {
    const res = await authFetch(`${API}/issues/scenarios/${scenarioId}`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching scenario by id:", err);
    return false;
  }
};

/**
 * Crea un escenario de simulación para un issue.
 *
 * @param {{
 *   issueId: string|Record<string, any>,
 *   scenarioName?: string,
 *   targetModelName?: string,
 *   targetModelId?: string,
 *   paramOverrides?: Record<string, any>,
 * }} params Parámetros de entrada.
 * @returns {Promise<Record<string, any>|false>}
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

    const res = await authFetch(
      `${API}/issues/${normalizedIssueId}/scenarios`,
      jsonRequest("POST", {
        scenarioName,
        targetModelName,
        targetModelId,
        paramOverrides,
      })
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error creating scenario:", err);
    return false;
  }
};

/**
 * Elimina un escenario por su id.
 *
 * @param {string} scenarioId Id del escenario.
 * @returns {Promise<Record<string, any>|false>}
 */
export const removeIssueScenario = async (scenarioId) => {
  try {
    const res = await authFetch(`${API}/issues/scenarios/${scenarioId}`, {
      method: "DELETE",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error removing scenario:", err);
    return false;
  }
};