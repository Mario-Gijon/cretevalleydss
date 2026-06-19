import { resolveParameterFieldEntry } from "../../decisionPlugins/modelParameters/modelParameterRegistry";

export const ParameterReadOnlyHost = ({
  parameter,
  value,
  context,
}) => {
  const entry = resolveParameterFieldEntry(parameter);
  const ReadOnlyComponent = entry.ReadOnlyComponent;

  return (
    <ReadOnlyComponent
      parameter={parameter}
      value={value}
      context={context}
    />
  );
};

export default ParameterReadOnlyHost;
