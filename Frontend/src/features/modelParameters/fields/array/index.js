import ArrayParameterField from "./ArrayParameterField";
import { buildArrayDefault, syncArrayValueWithExpectedLength } from "./array.defaults";

export const arrayParameterHandler = {
  FieldComponent: ArrayParameterField,
  buildDefault: buildArrayDefault,
  updateValue: syncArrayValueWithExpectedLength,
};
