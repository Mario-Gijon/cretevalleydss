import NumberGlobalParameterField from "./NumberGlobalParameterField";

const isEmpty = (value) => value === "" || value === null || value === undefined;

const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const numberGlobalParameterStructure = {
  key: "numberGlobal",
  Component: NumberGlobalParameterField,
  getInitialValue: (parameter) => parameter?.default ?? "",
  validate: (value, parameter) => {
    const required = parameter?.required === true;
    const restrictions = parameter?.restrictions || {};

    if (isEmpty(value)) {
      return required ? "This field is required." : null;
    }

    const numericValue = toFiniteNumberOrNull(value);
    if (numericValue === null) {
      return "Value must be a finite number.";
    }

    if (Number.isFinite(restrictions?.min) && numericValue < Number(restrictions.min)) {
      return `Value must be greater than or equal to ${restrictions.min}.`;
    }

    if (Number.isFinite(restrictions?.max) && numericValue > Number(restrictions.max)) {
      return `Value must be less than or equal to ${restrictions.max}.`;
    }

    if (Array.isArray(restrictions?.allowed) && restrictions.allowed.length > 0) {
      const allowedNumbers = restrictions.allowed
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item));

      if (!allowedNumbers.includes(numericValue)) {
        return `Value must be one of: ${restrictions.allowed.join(", ")}.`;
      }
    }

    return null;
  },
  normalize: (value, parameter) => {
    const required = parameter?.required === true;
    if (isEmpty(value)) {
      return required ? value : null;
    }

    return Number(value);
  },
};
