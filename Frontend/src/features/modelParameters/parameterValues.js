import { resolveParameterStructure } from "./parameter.registry";

const getParameterList = (parameters) => (Array.isArray(parameters) ? parameters : []);

export const buildInitialParameterValues = (parameters, context = {}) => {
  return getParameterList(parameters).reduce((accumulator, parameter) => {
    const parameterKey = parameter?.key;
    if (!parameterKey) return accumulator;

    const structure = resolveParameterStructure(parameter);
    accumulator[parameterKey] = structure.getInitialValue(parameter, context);
    return accumulator;
  }, {});
};

export const validateParameterValues = (parameters, values, context = {}) => {
  return getParameterList(parameters).reduce((accumulator, parameter) => {
    const parameterKey = parameter?.key;
    if (!parameterKey) return accumulator;

    const structure = resolveParameterStructure(parameter);
    const message = structure.validate(values?.[parameterKey], parameter, context);

    if (typeof message === "string" && message.trim().length > 0) {
      accumulator[parameterKey] = message;
    }

    return accumulator;
  }, {});
};

export const normalizeParameterValues = (parameters, values, context = {}) => {
  return getParameterList(parameters).reduce((accumulator, parameter) => {
    const parameterKey = parameter?.key;
    if (!parameterKey) return accumulator;

    const structure = resolveParameterStructure(parameter);
    accumulator[parameterKey] = structure.normalize(values?.[parameterKey], parameter, context);
    return accumulator;
  }, {});
};
