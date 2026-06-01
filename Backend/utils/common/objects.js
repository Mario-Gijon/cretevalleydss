export const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const hasOwnKey = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);
