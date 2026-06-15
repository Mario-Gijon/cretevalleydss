import { resolveParameterFieldEntry } from "../../decisionPlugins/modelParameters/modelParameterRegistry";

export const ParameterFieldHost = ({
  parameter,
  value,
  onChange,
  error,
  disabled,
  context,
}) => {
  const entry = resolveParameterFieldEntry(parameter);
  const FieldComponent = entry.FieldComponent;

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
