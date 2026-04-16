let accessToken = null;
let refreshInFlight = null;

const API = import.meta.env.VITE_API_BACK;

/**
 * Guarda el access token en memoria.
 *
 * @param {string|null|undefined} token Token de acceso.
 * @returns {void}
 */
export const setAccessToken = (token) => {
  accessToken = token || null;
};

/**
 * Elimina el access token almacenado en memoria.
 *
 * @returns {void}
 */
export const clearAccessToken = () => {
  accessToken = null;
};

/**
 * Devuelve el access token actual.
 *
 * @returns {string|null}
 */
export const getAccessToken = () => accessToken;

/**
 * Intenta parsear una respuesta JSON sin lanzar excepción si no hay body.
 *
 * @param {Response} response Respuesta de fetch.
 * @returns {Promise<object|null>}
 */
const readJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

/**
 * Solicita un nuevo access token usando la cookie de refresh token.
 *
 * @returns {Promise<string|null>}
 */
export async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const res = await fetch(`${API}/auth/refresh`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      clearAccessToken();
      return null;
    }

    const data = await readJsonSafe(res);
    const token = data?.success ? data?.data?.token ?? null : null;

    setAccessToken(token);
    return token;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/**
 * Ejecuta una petición autenticada y reintenta una vez si el token ha expirado.
 *
 * @param {string} url URL de la petición.
 * @param {object} options Opciones de fetch.
 * @param {object} config Configuración adicional.
 * @param {boolean} config.retryOnAuthFail Indica si debe reintentar tras un 401.
 * @returns {Promise<Response>}
 */
export async function authFetch(
  url,
  options = {},
  { retryOnAuthFail = true } = {}
) {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  if (res.status !== 401 || !retryOnAuthFail) {
    return res;
  }

  const body = await readJsonSafe(res.clone());
  const code = body?.error?.code;
  const message = (body?.message || "").toLowerCase();

  const isExpired = code === "TOKEN_EXPIRED" || message.includes("expired");
  const isNoToken = code === "NO_TOKEN" || message.includes("does not exist");

  if (!isExpired && !(isNoToken && !getAccessToken())) {
    return res;
  }

  const newToken = await refreshAccessToken();

  if (!newToken) {
    return res;
  }

  const retryHeaders = new Headers(options.headers || {});

  if (!retryHeaders.has("Content-Type") && options.body) {
    retryHeaders.set("Content-Type", "application/json");
  }

  retryHeaders.set("Authorization", `Bearer ${newToken}`);

  return fetch(url, {
    credentials: "include",
    ...options,
    headers: retryHeaders,
  });
}