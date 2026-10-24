import { resolveParameterFieldEntry } from "../../decisionPlugins/modelParameters";
import { inspectModelParameterDependencyChange } from "../logic/inspectModelParameterDependencyChange.js";

export const ParameterFieldHost = ({
  parameter,
  value,
  onChange,
  error,
  disabled,
  showValidation = false,
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
      showValidation={showValidation}
      parameterContext={parameterContext}
      inspectDependencyChange={(nextValue) => inspectModelParameterDependencyChange({
        changedParameter: parameter,
        nextValue,
        parameterContext,
      })}
    />
  );
};

export default ParameterFieldHost;
