const isPlainObject = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const normalizeTwoTupleAggregationValue = (parameter, value) => {
  if (!isPlainObject(value)) return value;

  const methodDefinition = Array.isArray(parameter?.restrictions?.methods)
    ? parameter.restrictions.methods.find((method) => method?.key === value.method)
    : null;

  if (
    !methodDefinition ||
    (Array.isArray(methodDefinition.subparameters) &&
      methodDefinition.subparameters.length > 0)
  ) {
    return value;
  }

  return {
    ...value,
    options: isPlainObject(value.options) ? value.options : {},
  };
};
