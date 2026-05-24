import SelectGlobalParameterField from "./SelectGlobalParameterField";

const isEmpty = (value) => value === "" || value === null || value === undefined;
const normalizeValueType = (parameter) => String(parameter?.valueType || "").trim().toLowerCase();

const toComparableValue = (value, valueType) => {
  if (valueType === "number") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }

  return value;
};

export const selectGlobalParameterStructure = {
  key: "selectGlobal",
  Component: SelectGlobalParameterField,
  getInitialValue: (parameter) => parameter?.default ?? "",
  validate: (value, parameter) => {
    const required = parameter?.required === true;
    const allowed = Array.isArray(parameter?.restrictions?.allowed)
      ? parameter.restrictions.allowed
      : [];
    const valueType = normalizeValueType(parameter);

    if (required && isEmpty(value)) {
      return "This field is required.";
    }

    if (allowed.length === 0) {
      return "Parameter restrictions.allowed must be a non-empty array.";
    }

    if (isEmpty(value)) {
      return null;
    }

    const normalizedValue = toComparableValue(value, valueType);
    const normalizedAllowed = allowed.map((item) => toComparableValue(item, valueType));

    if (!normalizedAllowed.includes(normalizedValue)) {
      return `Value must be one of: ${allowed.join(", ")}.`;
    }

    return null;
  },
  normalize: (value, parameter) => {
    if (isEmpty(value)) {
      return null;
    }

    if (normalizeValueType(parameter) === "number") {
      return Number(value);
    }

    return value;
  },
};
