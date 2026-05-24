import { resolveParameterStructure } from "./parameter.registry";

export const ParameterFieldHost = ({
  parameter,
  value,
  onChange,
  error,
  disabled,
  context,
}) => {
  const structure = resolveParameterStructure(parameter);
  const Component = structure.Component;

  return (
    <Component
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
