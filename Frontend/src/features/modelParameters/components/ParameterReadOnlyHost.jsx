import { resolveParameterFieldEntry } from "../../decisionPlugins/modelParameters";

export const ParameterReadOnlyHost = ({
  parameter,
  value,
  parameterContext,
}) => {
  const entry = resolveParameterFieldEntry(parameter);
  const ReadOnlyComponent = entry.ReadOnlyComponent;

  return (
    <ReadOnlyComponent
      parameter={parameter}
      value={value}
      parameterContext={parameterContext}
    />
  );
};

export default ParameterReadOnlyHost;
