export const normalizeValue = (val) => {
  if (val === null || val === undefined) return val;

  // Caso MongoDB
  if (typeof val === "object") {
    if ("$numberDouble" in val) return Number(val["$numberDouble"]);
    if ("$numberInt" in val) return Number(val["$numberInt"]);
  }

  // Strings numéricos
  if (typeof val === "string") return Number(val);

  // Si ya es número, lo devolvemos
  if (typeof val === "number") return val;

  // Por si acaso, devolvemos como está
  return val;
};
