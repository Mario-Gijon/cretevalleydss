import { authFetch } from "../utils/authFetch";
import {
  API,
  buildQuery,
  jsonRequest,
  requestJson,
  safeJson,
} from "./httpRequest.service.js";

/**
 * Ejecuta una petición autenticada del módulo admin y devuelve el payload JSON.
 *
 * Conserva el contrato actual de la capa admin:
 * - retorna el payload de la API cuando la petición responde
 * - retorna `false` ante errores de red/excepciones
 *
 * @param {string} path Ruta relativa a la API.
 * @param {object} options Opciones de fetch.
 * @param {string} errorPrefix Prefijo para el log de error.
 * @returns {Promise<object|false>}
 */
const requestAdmin = async (path, options, errorPrefix) => {
  try {
    const response = await authFetch(`${API}${path}`, options);
    return await safeJson(response);
  } catch (error) {
    console.error(errorPrefix, error);
    return false;
  }
};

/**
 * Comprueba si el usuario actual tiene acceso de administrador.
 *
 * @returns {Promise<object|false>}
 */
export const checkAdminAccess = async () =>
  requestAdmin("/auth/admin/check", { method: "GET" }, "Error checking admin access:");

/**
 * Obtiene el listado de expertos del panel admin.
 *
 * @param {object} options Opciones de filtro.
 * @param {string} options.q Texto de búsqueda.
 * @param {boolean} options.includeAdmins Indica si incluye administradores.
 * @returns {Promise<object|false>}
 */
export const getAllUsers = async ({ q = "", includeAdmins = true } = {}) => {
  const query = buildQuery({
    q: q?.trim(),
    includeAdmins: includeAdmins ? "true" : undefined,
  });

  return requestAdmin(
    `/admin/experts${query}`,
    { method: "GET" },
    "Error fetching experts:"
  );
};

/**
 * Crea un experto desde el panel admin.
 *
 * @param {object} userData Datos del experto.
 * @returns {Promise<object|false>}
 */
export const createUser = async (userData) =>
  requestAdmin(
    "/admin/experts",
    jsonRequest("POST", userData),
    "Error creating user:"
  );

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
}) =>
  requestAdmin(
    `/admin/experts/${id}`,
    jsonRequest("PATCH", {
      name,
      university,
      email,
      password,
      accountConfirm,
      role,
    }),
    "Error updating user:"
  );

/**
 * Elimina un experto desde el panel admin.
 *
 * @param {string} id Id del usuario.
 * @returns {Promise<object|false>}
 */
export const deleteUser = async (id) =>
  requestAdmin(`/admin/experts/${id}`, { method: "DELETE" }, "Error deleting user:");

/**
 * Obtiene el listado de issues del panel admin.
 *
 * @param {object} options Filtros de búsqueda.
 * @param {string} options.q Texto de búsqueda.
 * @param {string} options.active Estado activo.
 * @param {string} options.currentStage Etapa actual.
 * @param {string} options.isConsensus Filtro de consenso.
 * @param {string} options.ownerId Id del owner del issue.
 * @param {string} options.modelId Id del modelo.
 * @returns {Promise<object|false>}
 */
export const getAllIssues = async ({
  q = "",
  active = "all",
  currentStage = "all",
  isConsensus = "all",
  ownerId = "",
  modelId = "",
} = {}) => {
  const query = buildQuery({
    q: q?.trim(),
    active,
    currentStage,
    isConsensus,
    ownerId,
    modelId,
  });

  return requestAdmin(
    `/admin/issues${query}`,
    { method: "GET" },
    "Error fetching admin issues:"
  );
};

/**
 * Obtiene el detalle de un issue desde el panel admin.
 *
 * @param {string} id Id del issue.
 * @returns {Promise<object|false>}
 */
export const getIssueByIdAdmin = async (id) => {
  if (!id) return false;

  return requestAdmin(
    `/admin/issues/${id}`,
    { method: "GET" },
    "Error fetching admin issue detail:"
  );
};

/**
 * Obtiene el progreso de expertos de un issue.
 *
 * @param {string} issueId Id del issue.
 * @returns {Promise<object|false>}
 */
export const getIssueExpertsProgress = async (issueId) => {
  if (!issueId) return false;

  return requestAdmin(
    `/admin/issues/${issueId}/experts/progress`,
    { method: "GET" },
    "Error fetching issue experts progress:"
  );
};

/**
 * Obtiene las evaluaciones de un experto en un issue.
 *
 * @param {string} issueId Id del issue.
 * @param {string} expertId Id del experto.
 * @returns {Promise<object|false>}
 */
export const getIssueExpertEvaluations = async (issueId, expertId) => {
  if (!issueId || !expertId) return false;

  return requestAdmin(
    `/admin/issues/${issueId}/experts/${expertId}/evaluations`,
    { method: "GET" },
    "Error fetching issue expert evaluations:"
  );
};

/**
 * Obtiene los pesos de un experto en un issue.
 *
 * @param {string} issueId Id del issue.
 * @param {string} expertId Id del experto.
 * @returns {Promise<object|false>}
 */
export const getIssueExpertWeights = async (issueId, expertId) => {
  if (!issueId || !expertId) return false;

  return requestAdmin(
    `/admin/issues/${issueId}/experts/${expertId}/weights`,
    { method: "GET" },
    "Error fetching issue expert weights:"
  );
};

/**
 * Reasigna el owner responsable de un issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.issueId Id del issue.
 * @param {string} params.newOwnerId Id del nuevo owner.
 * @returns {Promise<object|false>}
 */
export const reassignIssueOwner = async ({ issueId, newOwnerId }) =>
  requestAdmin(
    `/admin/issues/${issueId}/owner`,
    jsonRequest("PATCH", { newOwnerId }),
    "Error reassigning issue owner:"
  );

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
}) =>
  requestAdmin(
    `/admin/issues/${issueId}/experts`,
    jsonRequest("PATCH", {
      expertsToAdd,
      expertsToRemove,
      domainAssignments,
    }),
    "Error editing issue experts as admin:"
  );

/**
 * Computa los pesos de un issue desde el panel admin.
 *
 * @param {string} issueId Id del issue.
 * @returns {Promise<object|false>}
 */
export const computeIssueWeightsAdminAction = async (issueId) => {
  if (!issueId) return false;

  return requestAdmin(
    `/admin/issues/${issueId}/weights/compute`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    "Error computing issue weights as admin:"
  );
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
  if (!issueId) return false;

  return requestAdmin(
    `/admin/issues/${issueId}/resolve`,
    jsonRequest("POST", { forceFinalize }),
    "Error resolving issue as admin:"
  );
};

/**
 * Elimina un issue desde el panel admin.
 *
 * @param {string} issueId Id del issue.
 * @returns {Promise<object|false>}
 */
export const removeIssueAdminAction = async (issueId) => {
  if (!issueId) return false;

  return requestAdmin(
    `/admin/issues/${issueId}`,
    { method: "DELETE" },
    "Error removing issue as admin:"
  );
};

/**
 * Obtiene el catálogo persistido de modelos desde MongoDB.
 *
 * @returns {Promise<object>}
 */
export const getAdminModelCatalog = async () =>
  requestJson(
    `${API}/admin/models/catalog`,
    { method: "GET" },
    {
      fetcher: authFetch,
      fallbackMessage: "Error fetching model catalog.",
    }
  );

export const getModelForgeCatalog = async () =>
  requestJson(
    `${API}/admin/model-forge/catalog`,
    { method: "GET" },
    {
      fetcher: authFetch,
      fallbackMessage: "Error fetching Model Forge catalog.",
    }
  );

export const getModelForgeAssetsAdmin = async () =>
  requestJson(
    `${API}/admin/model-forge/assets`,
    { method: "GET" },
    {
      fetcher: authFetch,
      fallbackMessage: "Error fetching Model Forge assets.",
    }
  );

export const previewModelForgeModelPackage = async (payload) =>
  requestJson(
    `${API}/admin/model-forge/model-package/preview`,
    jsonRequest("POST", payload),
    {
      fetcher: authFetch,
      fallbackMessage: "Error previewing Model Forge scaffold package.",
    }
  );

export const applyModelForgeModelPackage = async (payload) =>
  requestJson(
    `${API}/admin/model-forge/model-package/apply`,
    jsonRequest("POST", payload),
    {
      fetcher: authFetch,
      fallbackMessage: "Error applying Model Forge scaffold package.",
    }
  );

export const deleteModelForgeAssetAdmin = async (kind, key) =>
  requestJson(
    `${API}/admin/model-forge/assets/${encodeURIComponent(kind)}/${encodeURIComponent(
      key
    )}`,
    { method: "DELETE" },
    {
      fetcher: authFetch,
      fallbackMessage: "Error deleting Model Forge asset.",
    }
  );

export const restartBackendAdmin = async () =>
  requestJson(
    `${API}/admin/system/restart-backend`,
    jsonRequest("POST"),
    {
      fetcher: authFetch,
      fallbackMessage: "Error restarting Backend.",
    }
  );

export const getDecisionModelsServiceHealth = async () =>
  requestJson(
    `${API}/admin/decision-models-service/health`,
    { method: "GET" },
    {
      fetcher: authFetch,
      fallbackMessage: "DecisionModelsService health check failed.",
    }
  );

export const reloadDecisionModelsServiceAdmin = async () =>
  requestJson(
    `${API}/admin/decision-models-service/reload`,
    jsonRequest("POST"),
    {
      fetcher: authFetch,
      fallbackMessage: "Error refreshing DecisionModelsService.",
    }
  );

export const getCurrentModelManifestAdmin = async () =>
  requestJson(
    `${API}/admin/model-manifest/current`,
    { method: "GET" },
    {
      fetcher: authFetch,
      fallbackMessage: "Error fetching current model manifest.",
    }
  );

export const getBackendHealth = async () =>
  requestJson(
    `${API}/health`,
    { method: "GET" },
    {
      fallbackMessage: "Backend health check failed.",
    }
  );

/**
 * Actualiza la visibilidad de catálogo aplicable para un modelo.
 *
 * @param {string} modelId Id del modelo.
 * @param {object} visibilityUpdate Campo de visibilidad a actualizar.
 * @returns {Promise<object>}
 */
export const updateModelCatalogVisibility = async (modelId, visibilityUpdate) =>
  requestJson(
    `${API}/admin/models/${modelId}/catalog-visibility`,
    jsonRequest("PATCH", visibilityUpdate),
    {
      fetcher: authFetch,
      fallbackMessage: "Error updating model catalog visibility.",
    }
  );

/**
 * Ejecuta el dry-run del manifest de modelos desde el panel admin.
 *
 * @returns {Promise<object>}
 */
export const getModelManifestDryRun = async () =>
  requestJson(
    `${API}/admin/models/manifest/dry-run`,
    { method: "GET" },
    {
      fetcher: authFetch,
      fallbackMessage: "Error running model manifest dry-run.",
    }
  );

/**
 * Sincroniza manualmente el manifest de modelos con confirmación explícita.
 *
 * @returns {Promise<object>}
 */
export const syncModelManifest = async () =>
  requestJson(
    `${API}/admin/models/manifest/sync`,
    jsonRequest("POST", { confirm: true }),
    {
      fetcher: authFetch,
      fallbackMessage: "Error synchronizing model manifest.",
    }
  );
