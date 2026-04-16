const API = import.meta.env.VITE_API_BACK;

/**
 * Intenta parsear una respuesta JSON sin lanzar excepción si no hay body.
 *
 * @param {*} response
 * @returns {Promise<any|null>}
 */
export const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * Construye una query string a partir de un objeto plano.
 *
 * @param {object} paramsObj
 * @returns {string}
 */
export const buildQuery = (paramsObj = {}) => {
  const params = new URLSearchParams();

  Object.entries(paramsObj).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value === "string" && value.trim() === "") {
      return;
    }

    params.set(key, String(value));
  });

  const query = params.toString();

  return query ? `?${query}` : "";
};

/**
 * Construye una petición JSON.
 *
 * @param {string} method
 * @param {object} [body={}]
 * @returns {object}
 */
export const jsonRequest = (method, body = {}) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * Construye una respuesta de error de red normalizada.
 *
 * @param {string} [fallbackMessage="Network error. Please try again."]
 * @returns {object}
 */
export const buildNetworkErrorResponse = (
  fallbackMessage = "Network error. Please try again."
) => ({
  success: false,
  message: fallbackMessage,
  data: null,
  meta: null,
  error: {
    code: "NETWORK_ERROR",
    field: null,
    details: null,
  },
  status: 0,
});

/**
 * Resuelve el mensaje principal de una respuesta API.
 *
 * @param {any} payload
 * @param {string|null} fallbackMessage
 * @returns {string|null}
 */
const resolveMessage = (payload, fallbackMessage = null) =>
  payload?.message ?? payload?.msg ?? fallbackMessage;

/**
 * Resuelve el campo afectado, aceptando formatos antiguos y nuevos.
 *
 * @param {any} payload
 * @returns {string|null}
 */
const resolveField = (payload) => {
  if (payload?.error?.field) {
    return payload.error.field;
  }

  if (payload?.field) {
    return payload.field;
  }

  if (payload?.obj) {
    return payload.obj;
  }

  if (typeof payload?.details === "string") {
    return payload.details;
  }

  return null;
};

/**
 * Resuelve los detalles adicionales de error.
 *
 * @param {any} payload
 * @returns {any}
 */
const resolveDetails = (payload) => {
  if (payload?.error?.details != null) {
    return payload.error.details;
  }

  if (payload?.details != null && typeof payload.details !== "string") {
    return payload.details;
  }

  return null;
};

/**
 * Resuelve el código de error normalizado.
 *
 * @param {any} payload
 * @param {number} status
 * @param {boolean} success
 * @returns {string|null}
 */
const resolveErrorCode = (payload, status, success) => {
  if (success) {
    return null;
  }

  if (payload?.error?.code) {
    return payload.error.code;
  }

  if (payload?.code) {
    return payload.code;
  }

  if (status >= 500) {
    return "INTERNAL_ERROR";
  }

  if (status === 401) {
    return "UNAUTHORIZED";
  }

  if (status === 403) {
    return "FORBIDDEN";
  }

  if (status === 404) {
    return "NOT_FOUND";
  }

  if (status === 409) {
    return "CONFLICT";
  }

  return "REQUEST_ERROR";
};

/**
 * Normaliza la respuesta de la API manteniendo además cualquier propiedad original.
 *
 * Esto permite migrar gradualmente el frontend sin romper pantallas antiguas que
 * todavía lean claves legacy como "issues", "tasks" o "msg".
 *
 * @param {any} payload
 * @param {*} response
 * @param {string} [fallbackMessage="Request failed."]
 * @returns {object}
 */
export const normalizeApiResponse = (
  payload,
  response,
  fallbackMessage = "Request failed."
) => {
  const status = response?.status ?? 0;
  const success =
    typeof payload?.success === "boolean" ? payload.success : Boolean(response?.ok);

  const normalized = {
    success,
    message: resolveMessage(payload, success ? null : fallbackMessage),
    data: payload?.data ?? null,
    meta: payload?.meta ?? null,
    error: success
      ? null
      : {
          code: resolveErrorCode(payload, status, success),
          field: resolveField(payload),
          details: resolveDetails(payload),
        },
    status,
  };

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return {
      ...payload,
      ...normalized,
    };
  }

  return normalized;
};

/**
 * Ejecuta una petición JSON y devuelve siempre una respuesta normalizada.
 *
 * @param {string} url
 * @param {object} [options={}]
 * @param {object} [config={}]
 * @param {Function} [config.fetcher=fetch] Función fetch a usar.
 * @param {string} [config.fallbackMessage="Request failed."] Mensaje por defecto.
 * @returns {Promise<object>}
 */
export const requestJson = async (
  url,
  options = {},
  { fetcher = fetch, fallbackMessage = "Request failed." } = {}
) => {
  try {
    const response = await fetcher(url, options);
    const payload = await safeJson(response);

    return normalizeApiResponse(payload, response, fallbackMessage);
  } catch (error) {
    console.error("Request error:", error);
    return buildNetworkErrorResponse(fallbackMessage);
  }
};

export { API };