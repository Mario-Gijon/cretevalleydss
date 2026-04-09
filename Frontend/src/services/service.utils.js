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
 * @param {object} body
 * @returns {object}
 */
export const jsonRequest = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export { API };