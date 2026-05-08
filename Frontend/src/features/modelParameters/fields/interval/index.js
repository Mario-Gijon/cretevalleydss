import IntervalParameterField from "./IntervalParameterField";

export const intervalParameterHandler = {
  FieldComponent: IntervalParameterField,
  buildDefault: ({ parameter }) => {
    const restrictions = parameter?.restrictions || {};
    const defaultValue = parameter?.default;
    return Array.isArray(defaultValue)
      ? defaultValue
      : [restrictions?.min ?? "", restrictions?.max ?? ""];
  },
};
