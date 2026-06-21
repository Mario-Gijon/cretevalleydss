import { resolveParameterFieldEntry } from "../../decisionPlugins/modelParameters/modelParameterRegistry";

export const ParameterFieldHost = ({
  parameter,
  value,
  onChange,
  error,
  disabled,
  parameterContext,
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
      parameterContext={parameterContext}
    />
  );
};

export default ParameterFieldHost;
