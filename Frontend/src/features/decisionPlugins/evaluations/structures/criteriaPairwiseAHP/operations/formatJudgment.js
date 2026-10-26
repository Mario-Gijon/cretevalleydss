export const formatJudgment = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  if (Math.abs(value - Math.round(value)) <= 1e-12) return String(Math.round(value));
  const reciprocal = 1 / value;
  if (Math.abs(reciprocal - Math.round(reciprocal)) <= 1e-10) {
    return `1/${Math.round(reciprocal)}`;
  }
  return Number.parseFloat(value.toPrecision(8)).toString();
};
