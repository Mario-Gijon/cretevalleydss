import IntervalGlobalParameterField from "./IntervalGlobalParameterField";

const isEmpty = (value) => value === "" || value === null || value === undefined;

const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readPair = (value) => {
  if (!Array.isArray(value)) return null;
  if (value.length !== 2) return null;
  return value;
};

export const intervalGlobalParameterStructure = {
  key: "intervalGlobal",
  Component: IntervalGlobalParameterField,
  getInitialValue: (parameter) => {
    if (Array.isArray(parameter?.default)) {
      return parameter.default.slice(0, 2);
    }

    const restrictions = parameter?.restrictions || {};
    return [restrictions?.min ?? "", restrictions?.max ?? ""];
  },
  validate: (value, parameter) => {
    const required = parameter?.required === true;
    const restrictions = parameter?.restrictions || {};
    const pair = readPair(value);

    if (!pair) {
      return "Value must be an interval with two positions.";
    }

    const [left, right] = pair;
    const leftEmpty = isEmpty(left);
    const rightEmpty = isEmpty(right);

    if (required && (leftEmpty || rightEmpty)) {
      return "Both interval bounds are required.";
    }

    if (!required && leftEmpty && rightEmpty) {
      return null;
    }

    if (leftEmpty || rightEmpty) {
      return "Both interval bounds are required.";
    }

    const leftNumber = toFiniteNumberOrNull(left);
    const rightNumber = toFiniteNumberOrNull(right);

    if (leftNumber === null || rightNumber === null) {
      return "Both interval values must be finite numbers.";
    }

    if (Number.isFinite(restrictions?.min)) {
      if (leftNumber < Number(restrictions.min) || rightNumber < Number(restrictions.min)) {
        return `Interval values must be greater than or equal to ${restrictions.min}.`;
      }
    }

    if (Number.isFinite(restrictions?.max)) {
      if (leftNumber > Number(restrictions.max) || rightNumber > Number(restrictions.max)) {
        return `Interval values must be less than or equal to ${restrictions.max}.`;
      }
    }

    if (restrictions?.ordered === "strictIncreasing" && !(leftNumber < rightNumber)) {
      return "Interval must satisfy left < right.";
    }

    if (restrictions?.ordered === "nonDecreasing" && !(leftNumber <= rightNumber)) {
      return "Interval must satisfy left <= right.";
    }

    return null;
  },
  normalize: (value, parameter) => {
    const pair = readPair(value);
    if (!pair) return null;

    const [left, right] = pair;
    const required = parameter?.required === true;

    if (!required && isEmpty(left) && isEmpty(right)) {
      return null;
    }

    return [Number(left), Number(right)];
  },
};
