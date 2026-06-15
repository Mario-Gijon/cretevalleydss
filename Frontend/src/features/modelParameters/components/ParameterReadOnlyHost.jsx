import { resolveParameterFieldEntry } from "../../decisionPlugins/modelParameters/modelParameterRegistry";

export const ParameterReadOnlyHost = ({
  parameter,
  value,
  leafNames,
  leafCriteria,
  context,
}) => {
  const entry = resolveParameterFieldEntry(parameter);
  const ReadOnlyComponent = entry.ReadOnlyComponent;

  return (
    <ReadOnlyComponent
      parameter={parameter}
      value={value}
      leafNames={leafNames}
      leafCriteria={leafCriteria}
      context={context}
    />
  );
};

export default ParameterReadOnlyHost;
