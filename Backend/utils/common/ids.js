export const toIdString = (value) => {
  if (value == null) return "";

  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);

  if (typeof value !== "object") {
    return "";
  }

  if (typeof value.toHexString === "function") {
    const result = value.toHexString();
    return typeof result === "string" ? result.trim() : "";
  }

  if (value._id != null && value._id !== value) {
    return toIdString(value._id);
  }

  if (value.id != null && value.id !== value) {
    return toIdString(value.id);
  }

  if (typeof value.toString === "function") {
    const result = value.toString();
    return typeof result === "string" ? result.trim() : "";
  }

  return "";
};
export const sameId = (a, b) => {
  const left = toIdString(a);
  const right = toIdString(b);

  return Boolean(left && right && left === right);
};

export const uniqueIdStrings = (values = []) => {
  return [...new Set(values.map(toIdString).filter(Boolean))];
};

export const indexById = (items = [], selector = null) => {
  const map = new Map();

  for (const item of items) {
    const rawId =
      typeof selector === "function"
        ? selector(item)
        : selector
        ? item?.[selector]
        : item;

    const id = toIdString(rawId);
    if (id) map.set(id, item);
  }

  return map;
};

export const sortByIdOrder = (items = [], idOrder = [], selector = null) => {
  const orderMap = new Map(
    uniqueIdStrings(idOrder).map((id, index) => [id, index])
  );

  return [...items].sort((a, b) => {
    const aId = toIdString(
      typeof selector === "function" ? selector(a) : selector ? a?.[selector] : a
    );
    const bId = toIdString(
      typeof selector === "function" ? selector(b) : selector ? b?.[selector] : b
    );

    const aIndex = orderMap.has(aId) ? orderMap.get(aId) : Number.MAX_SAFE_INTEGER;
    const bIndex = orderMap.has(bId) ? orderMap.get(bId) : Number.MAX_SAFE_INTEGER;

    return aIndex - bIndex;
  });
};