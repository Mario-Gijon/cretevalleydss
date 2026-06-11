export const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export default isPlainObject;
