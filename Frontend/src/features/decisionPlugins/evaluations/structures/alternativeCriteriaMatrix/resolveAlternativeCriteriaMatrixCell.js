const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const resolveMatrixPayload = (payload) =>
  isPlainObject(payload) ? payload : {};

export const resolveMatrixCell = ({
  cell,
  fallbackExpressionDomain = null,
} = {}) => {
  if (cell === null || cell === undefined) {
    return {
      value: "",
      expressionDomain: fallbackExpressionDomain,
    };
  }

  if (isPlainObject(cell)) {
    return {
      value: cell.value ?? "",
      expressionDomain:
        cell.expressionDomain ??
        cell.domain ??
        fallbackExpressionDomain,
    };
  }

  return {
    value: cell,
    expressionDomain: fallbackExpressionDomain,
  };
};
