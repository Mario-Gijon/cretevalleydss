// src/utils/authFetch.js
let accessToken = null;
let refreshInFlight = null;

export const setAccessToken = (t) => { accessToken = t || null; };
export const clearAccessToken = () => { accessToken = null; };
export const getAccessToken = () => accessToken;

const API = import.meta.env.VITE_API_BACK;

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

    const data = await res.json();
    const token = data?.success ? data.token : null;
    setAccessToken(token);
    return token;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

const readJsonSafe = async (res) => {
  try { return await res.json(); } catch { return null; }
};

export async function authFetch(url, options = {}, { retryOnAuthFail = true } = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // ✅ si tu API necesita cookies en CORS, deja include
  const res = await fetch(url, { credentials: "include", ...options, headers });

  if (res.status !== 401 || !retryOnAuthFail) return res;

  // Miramos el motivo del 401 (sin consumir el body del response principal)
  const body = await readJsonSafe(res.clone());
  const code = body?.code;
  const msg = (body?.msg || "").toLowerCase();

  const isExpired = code === "TOKEN_EXPIRED" || msg.includes("expired");
  const isNoToken = code === "NO_TOKEN" || msg.includes("does not exist");

  // ✅ refrescar solo si:
  // - está expirado, o
  // - no hay token en memoria (típico reload) y backend responde NO_TOKEN
  if (!isExpired && !(isNoToken && !getAccessToken())) return res;

  const newToken = await refreshAccessToken();
  if (!newToken) return res;

  const retryHeaders = new Headers(options.headers || {});
  if (!retryHeaders.has("Content-Type") && options.body) retryHeaders.set("Content-Type", "application/json");
  retryHeaders.set("Authorization", `Bearer ${newToken}`);

  return fetch(url, { credentials: "include", ...options, headers: retryHeaders });
}