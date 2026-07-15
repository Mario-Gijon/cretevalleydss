import { toIdString } from "../../../../../utils/common/ids.js";

export const toRequiredId = (value, field) => {
  const id = toIdString(value?._id || value);

  if (!id) {
    throw new Error(`Finished issue payload requires ${field} id`);
  }

  return id;
};

export const toNullableId = (value) => toIdString(value?._id || value) || null;

export const toIsoOrNull = (value) => {
  if (value === null || value === undefined) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const cloneSerializable = (value, fallback = null) => {
  if (value === undefined) return fallback;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

export const sortById = (items, getId = (item) => item?.id || item?._id) =>
  [...items].sort((left, right) =>
    String(getId(left) || "").localeCompare(String(getId(right) || ""))
  );
