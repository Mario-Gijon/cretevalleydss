const normalizeParameters = (parameters) => (Array.isArray(parameters) ? parameters : []);

export const buildInitialParameterValues = (parameters) => {
  const list = normalizeParameters(parameters);

  return list.reduce((accumulator, parameter) => {
    const key = parameter?.key;
    if (!key) return accumulator;

    accumulator[key] = parameter?.default ?? "";
    return accumulator;
  }, {});
};

export const pruneParameterValues = (parameters, values) => {
  const list = normalizeParameters(parameters);
  const allowedKeys = new Set(list.map((parameter) => parameter?.key).filter(Boolean));
  const source =
    values && typeof values === "object" && !Array.isArray(values) ? values : {};

  return Object.entries(source).reduce((accumulator, [key, value]) => {
    if (allowedKeys.has(key)) {
      accumulator[key] = value;
    }

    return accumulator;
  }, {});
};
