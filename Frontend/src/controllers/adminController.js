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
 * Construye una query string a partir de un objeto plano.
 *
 * @param {Record<string, any>} paramsObj Parámetros de entrada.
 * @returns {string}
 */
const buildQuery = (paramsObj = {}) => {
  const params = new URLSearchParams();

  Object.entries(paramsObj).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    params.set(key, String(value));
  });

  const query = params.toString();
  return query ? `?${query}` : "";
};

/* =========================================================
 * Admin auth
 * ========================================================= */

/**
 * Comprueba si el usuario actual tiene acceso de administrador.
 *
 * @returns {Promise<Record<string, any>|false>}
 */
export const checkAdminAccess = async () => {
  try {
    const res = await authFetch(`${API}/auth/admin/check`, { method: "GET" });
    return await safeJson(res);
  } catch (err) {
    console.error("Error checking admin access:", err);
    return false;
  }
};

/* =========================================================
 * Users / Experts admin
 * ========================================================= */

/**
 * Obtiene el listado de expertos del panel admin.
 *
 * @param {{ q?: string, includeAdmins?: boolean }} [options={}] Opciones de filtro.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getAllUsers = async ({ q = "", includeAdmins = true } = {}) => {
  try {
    const query = buildQuery({
      q: q?.trim(),
      includeAdmins: includeAdmins ? "true" : undefined,
    });

    const res = await authFetch(`${API}/admin/experts${query}`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching experts:", err);
    return false;
  }
};

/**
 * Crea un experto desde el panel admin.
 *
 * @param {Record<string, any>} userData Datos del experto.
 * @returns {Promise<Record<string, any>|false>}
 */
export const createUser = async (userData) => {
  try {
    const res = await authFetch(`${API}/admin/experts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error creating user:", err);
    return false;
  }
};

/**
 * Actualiza un experto desde el panel admin.
 *
 * @param {{
 *   id: string,
 *   name?: string,
 *   university?: string,
 *   email?: string,
 *   password?: string,
 *   accountConfirm?: boolean,
 *   role?: string,
 * }} payload Datos a actualizar.
 * @returns {Promise<Record<string, any>|false>}
 */
export const updateUser = async ({
  id,
  name,
  university,
  email,
  password,
  accountConfirm,
  role,
}) => {
  try {
    const res = await authFetch(`${API}/admin/experts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        university,
        email,
        password,
        accountConfirm,
        role,
      }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error updating user:", err);
    return false;
  }
};

/**
 * Elimina un experto desde el panel admin.
 *
 * @param {string} id Id del usuario.
 * @returns {Promise<Record<string, any>|false>}
 */
export const deleteUser = async (id) => {
  try {
    const res = await authFetch(`${API}/admin/experts/${id}`, {
      method: "DELETE",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error deleting user:", err);
    return false;
  }
};

/* =========================================================
 * Issues admin
 * ========================================================= */

/**
 * Obtiene el listado de issues del panel admin.
 *
 * @param {{
 *   q?: string,
 *   active?: string,
 *   currentStage?: string,
 *   isConsensus?: string,
 *   adminId?: string,
 *   modelId?: string,
 * }} [options={}] Filtros de búsqueda.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getAllIssues = async ({
  q = "",
  active = "all",
  currentStage = "all",
  isConsensus = "all",
  adminId = "",
  modelId = "",
} = {}) => {
  try {
    const query = buildQuery({
      q: q?.trim(),
      active,
      currentStage,
      isConsensus,
      adminId,
      modelId,
    });

    const res = await authFetch(`${API}/admin/issues${query}`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching admin issues:", err);
    return false;
  }
};

/**
 * Obtiene el detalle de un issue desde el panel admin.
 *
 * @param {string} id Id del issue.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getIssueByIdAdmin = async (id) => {
  try {
    if (!id) return false;

    const res = await authFetch(`${API}/admin/issues/${id}`, {
      method: "GET",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching admin issue detail:", err);
    return false;
  }
};

/**
 * Obtiene el progreso de expertos de un issue.
 *
 * @param {string} issueId Id del issue.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getIssueExpertsProgress = async (issueId) => {
  try {
    if (!issueId) return false;

    const res = await authFetch(
      `${API}/admin/issues/${issueId}/experts/progress`,
      {
        method: "GET",
      }
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching issue experts progress:", err);
    return false;
  }
};

/**
 * Obtiene las evaluaciones de un experto en un issue.
 *
 * @param {string} issueId Id del issue.
 * @param {string} expertId Id del experto.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getIssueExpertEvaluations = async (issueId, expertId) => {
  try {
    if (!issueId || !expertId) return false;

    const res = await authFetch(
      `${API}/admin/issues/${issueId}/experts/${expertId}/evaluations`,
      {
        method: "GET",
      }
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching issue expert evaluations:", err);
    return false;
  }
};

/**
 * Obtiene los pesos de un experto en un issue.
 *
 * @param {string} issueId Id del issue.
 * @param {string} expertId Id del experto.
 * @returns {Promise<Record<string, any>|false>}
 */
export const getIssueExpertWeights = async (issueId, expertId) => {
  try {
    if (!issueId || !expertId) return false;

    const res = await authFetch(
      `${API}/admin/issues/${issueId}/experts/${expertId}/weights`,
      {
        method: "GET",
      }
    );

    return await safeJson(res);
  } catch (err) {
    console.error("Error fetching issue expert weights:", err);
    return false;
  }
};

/**
 * Reasigna el administrador responsable de un issue.
 *
 * @param {{ issueId: string, newAdminId: string }} params Parámetros de entrada.
 * @returns {Promise<Record<string, any>|false>}
 */
export const reassignIssueAdmin = async ({ issueId, newAdminId }) => {
  try {
    const res = await authFetch(`${API}/admin/issues/${issueId}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newAdminId,
      }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error reassigning issue admin:", err);
    return false;
  }
};

/* =========================================================
 * Admin acting as creator on issues
 * ========================================================= */

/**
 * Edita los expertos de un issue desde el panel admin.
 *
 * @param {{
 *   issueId: string,
 *   expertsToAdd?: string[],
 *   expertsToRemove?: string[],
 *   domainAssignments?: Record<string, any>|null,
 * }} params Parámetros de entrada.
 * @returns {Promise<Record<string, any>|false>}
 */
export const editIssueExpertsAdminAction = async ({
  issueId,
  expertsToAdd = [],
  expertsToRemove = [],
  domainAssignments = null,
}) => {
  try {
    const res = await authFetch(`${API}/admin/issues/${issueId}/experts`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expertsToAdd,
        expertsToRemove,
        domainAssignments,
      }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error editing issue experts as admin:", err);
    return false;
  }
};

/**
 * Computa los pesos de un issue desde el panel admin.
 *
 * @param {string} issueId Id del issue.
 * @returns {Promise<Record<string, any>|false>}
 */
export const computeIssueWeightsAdminAction = async (issueId) => {
  try {
    if (!issueId) return false;

    const res = await authFetch(`${API}/admin/issues/${issueId}/weights/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error computing issue weights as admin:", err);
    return false;
  }
};

/**
 * Resuelve un issue desde el panel admin.
 *
 * @param {string} issueId Id del issue.
 * @param {boolean} [forceFinalize=false] Fuerza finalización si aplica.
 * @returns {Promise<Record<string, any>|false>}
 */
export const resolveIssueAdminAction = async (
  issueId,
  forceFinalize = false
) => {
  try {
    if (!issueId) return false;

    const res = await authFetch(`${API}/admin/issues/${issueId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        forceFinalize,
      }),
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error resolving issue as admin:", err);
    return false;
  }
};

/**
 * Elimina un issue desde el panel admin.
 *
 * @param {string} issueId Id del issue.
 * @returns {Promise<Record<string, any>|false>}
 */
export const removeIssueAdminAction = async (issueId) => {
  try {
    if (!issueId) return false;

    const res = await authFetch(`${API}/admin/issues/${issueId}`, {
      method: "DELETE",
    });

    return await safeJson(res);
  } catch (err) {
    console.error("Error removing issue as admin:", err);
    return false;
  }
};