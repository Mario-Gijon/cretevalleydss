export const PENDING_BACKEND_CHANGE_STORAGE_KEY = "system.pendingBackendChange";

const DEFAULT_MAX_AGE_MS = 2 * 60 * 1000;

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const getPendingBackendChange = () => {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.sessionStorage.getItem(
      PENDING_BACKEND_CHANGE_STORAGE_KEY
    );
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const isRecentPendingBackendChange = (maxAgeMs = DEFAULT_MAX_AGE_MS) => {
  const pendingBackendChange = getPendingBackendChange();
  if (!pendingBackendChange) return false;

  const createdAt = Number(pendingBackendChange.createdAt);
  if (!Number.isFinite(createdAt) || createdAt <= 0) return false;

  return Date.now() - createdAt <= maxAgeMs;
};

export const setPendingBackendChange = (payload) => {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    PENDING_BACKEND_CHANGE_STORAGE_KEY,
    JSON.stringify(payload)
  );
};

export const updatePendingBackendChange = (patch) => {
  const currentValue = getPendingBackendChange();
  if (!currentValue) return null;

  const nextValue = {
    ...currentValue,
    ...(isPlainObject(patch) ? patch : {}),
  };

  setPendingBackendChange(nextValue);
  return nextValue;
};

export const clearPendingBackendChange = () => {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(PENDING_BACKEND_CHANGE_STORAGE_KEY);
};
