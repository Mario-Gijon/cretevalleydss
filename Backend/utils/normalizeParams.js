import { normalizeValue } from "./normalizeValue.js";

export const normalizeParams = (params) => {
  const normalized = {};
  for (const key in params) {
    if (Array.isArray(params[key])) {
      normalized[key] = params[key].map((v) => normalizeValue(v));
    } else {
      normalized[key] = normalizeValue(params[key]);
    }
  }
  return normalized;
}