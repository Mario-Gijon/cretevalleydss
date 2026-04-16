import { authFetch } from "../utils/authFetch";

const API = import.meta.env.VITE_API_BACK;

/**
 * Intenta parsear una respuesta JSON sin lanzar excepción si no hay body.
 *
 * @param {Response} res Respuesta de fetch.
 * @returns {Promise<object|null>}
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
 * @param {object} paramsObj Parámetros de entrada.
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

/**
 * Comprueba si el usuario actual tiene acceso de administrador.
 *
 * @returns {Promise<object|false>}
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

/**
 * Obtiene el listado de expertos del panel admin.
 *
 * @param {object} options Opciones de filtro.
 * @param {string} options.q Texto de búsqueda.
 * @param {boolean} options.includeAdmins Indica si incluye administradores.
 * @returns {Promise<object|false>}
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
 * @param {object} userData Datos del experto.
 * @returns {Promise<object|false>}
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
 * @param {object} payload Datos a actualizar.
 * @param {string} payload.id Id del usuario.
 * @param {string} payload.name Nombre.
 * @param {string} payload.university Universidad.
 * @param {string} payload.email Email.
 * @param {string} payload.password Contraseña.
 * @param {boolean} payload.accountConfirm Estado de confirmación.
 * @param {string} payload.role Rol.
 * @returns {Promise<object|false>}
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
 * @returns {Promise<object|false>}
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

/**
 * Obtiene el listado de issues del panel admin.
 *
 * @param {object} options Filtros de búsqueda.
 * @param {string} options.q Texto de búsqueda.
 * @param {string} options.active Estado activo.
 * @param {string} options.currentStage Etapa actual.
 * @param {string} options.isConsensus Filtro de consenso.
 * @param {string} options.adminId Id del administrador.
 * @param {string} options.modelId Id del modelo.
 * @returns {Promise<object|false>}
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
 * @returns {Promise<object|false>}
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
 * @returns {Promise<object|false>}
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
 * @returns {Promise<object|false>}
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
 * @returns {Promise<object|false>}
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
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.newAdminId Id del nuevo administrador.
 * @returns {Promise<object|false>}
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

/**
 * Edita los expertos de un issue desde el panel admin.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string[]} params.expertsToAdd Expertos a añadir.
 * @param {string[]} params.expertsToRemove Expertos a eliminar.
 * @param {object|null} params.domainAssignments Asignaciones de dominios.
 * @returns {Promise<object|false>}
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
 * @returns {Promise<object|false>}
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
 * @param {boolean} forceFinalize Fuerza finalización si aplica.
 * @returns {Promise<object|false>}
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
 * @returns {Promise<object|false>}
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