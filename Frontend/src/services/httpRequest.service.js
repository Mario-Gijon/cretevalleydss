const API = import.meta.env.VITE_API_BACK;

/**
 * Intenta parsear una respuesta JSON sin lanzar excepción si no hay body.
 *
 * @param {Response} response Respuesta de fetch.
 * @returns {Promise<object|null>}
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
 * @param {object} paramsObj Parámetros de entrada.
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
 * @param {string} method Método HTTP.
 * @param {object} body Cuerpo JSON.
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
 * @param {string} fallbackMessage Mensaje principal.
 * @returns {object}
 */
export const buildNetworkErrorResponse = (
  fallbackMessage = "Network error. Please try again."
) => ({
  success: false,
  message: fallbackMessage,
  data: null,
  error: {
    code: "NETWORK_ERROR",
    field: null,
    details: null,
  },
  status: 0,
});

/**
 * Normaliza la respuesta de la API al contrato HTTP actual.
 *
 * @param {object|null} payload Respuesta JSON parseada.
 * @param {Response} response Respuesta original de fetch.
 * @param {string} fallbackMessage Mensaje por defecto si falla.
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

  let code = payload?.error?.code ?? null;

  if (!success && !code) {
    if (status >= 500) {
      code = "INTERNAL_ERROR";
    } else if (status === 401) {
      code = "UNAUTHORIZED";
    } else if (status === 403) {
      code = "FORBIDDEN";
    } else if (status === 404) {
      code = "NOT_FOUND";
    } else if (status === 409) {
      code = "CONFLICT";
    } else {
      code = "REQUEST_ERROR";
    }
  }

  return {
    success,
    message: payload?.message ?? (success ? null : fallbackMessage),
    data:
      payload &&
      typeof payload === "object" &&
      Object.prototype.hasOwnProperty.call(payload, "data")
        ? payload.data
        : null,
    error: success
      ? null
      : {
          code,
          field: payload?.error?.field ?? null,
          details: payload?.error?.details ?? null,
        },
    status,
  };
};

/**
 * Ejecuta una petición JSON y devuelve una respuesta normalizada.
 *
 * @param {string} url URL de destino.
 * @param {object} options Opciones de fetch.
 * @param {object} config Configuración adicional.
 * @param {Function} config.fetcher Función fetch a usar.
 * @param {string} config.fallbackMessage Mensaje por defecto.
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