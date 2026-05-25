import { resolveParameterField } from "./parameter.registry";

export const ParameterFieldHost = ({
  parameter,
  value,
  onChange,
  error,
  disabled,
  context,
}) => {
  const FieldComponent = resolveParameterField(parameter);

  return (
    <FieldComponent
      parameter={parameter}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
      context={context}
    />
  );
};

export default ParameterFieldHost;
