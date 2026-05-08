import NumberParameterField from "./NumberParameterField";

export const numberParameterHandler = {
  FieldComponent: NumberParameterField,
  buildDefault: ({ parameter }) => parameter?.default ?? "",
};
