import { Box, Stack, Typography } from "@mui/material";

import { ParameterFieldHost } from "../../../../../modelParameters/rendering";
import { buildParameterContext } from "../../../../../modelParameters/context";
import { inspectModelParameterDependencyChange } from "../../../../../modelParameters/logic/inspectModelParameterDependencyChange.js";
import { reconcileModelParameterDependencyChange } from "../../../../../modelParameters/logic/reconcileModelParameterDependencyChange.js";
import { resolveParameterFieldEntry } from "../../../../../decisionPlugins/modelParameters";
import { addModelParameterColorScopeSx } from "../../addModelDialog.styles.js";

const buildParameterGroupsByKey = (parameters) => {
  const parametersByStructureKey = new Map(
    parameters.map((parameter) => [parameter.parameterStructureKey, parameter])
  );
  const groupsByParameterKey = new Map();

  parameters.forEach((parameter) => {
    const group = resolveParameterFieldEntry(parameter)?.parameterGroup;
    if (!group || !group.memberStructureKeys.every((key) => parametersByStructureKey.has(key))) return;

    const parametersByGroupStructureKey = Object.fromEntries(
      group.memberStructureKeys.map((key) => [key, parametersByStructureKey.get(key)])
    );
    const groupInfo = {
      group,
      parametersByStructureKey: parametersByGroupStructureKey,
      primaryParameterKey: parameter.key,
    };
    group.memberStructureKeys.forEach((key) => {
      groupsByParameterKey.set(parametersByGroupStructureKey[key].key, groupInfo);
    });
  });

  return groupsByParameterKey;
};

const ModelParametersFields = ({
  parameterContext,
  parameters,
  selectedModel,
  values,
  onParameterChange,
}) => {
  const currentValues = values && typeof values === "object" ? values : {};
  const currentContext = buildParameterContext({
    ...parameterContext,
    model: selectedModel,
    parameterDefinitions: parameters,
    parameterValues: currentValues,
  });
  const parameterGroupsByKey = buildParameterGroupsByKey(parameters);

  const handleParameterChange = (changedParameter, nextValue) => {
    const nextValues = { ...currentValues };
    if (nextValue === undefined) delete nextValues[changedParameter.key];
    else nextValues[changedParameter.key] = nextValue;

    const nextContext = buildParameterContext({
      ...parameterContext,
      model: selectedModel,
      parameterDefinitions: parameters,
      parameterValues: nextValues,
    });
    const reconciledValues = reconcileModelParameterDependencyChange({
      changedParameter,
      parameters,
      nextValues,
      previousContext: currentContext,
      nextContext,
    });

    if (
      JSON.stringify(currentValues[changedParameter.key]) !==
      JSON.stringify(reconciledValues[changedParameter.key])
    ) {
      onParameterChange(changedParameter.key, reconciledValues[changedParameter.key]);
    }
    Object.entries(reconciledValues).forEach(([key, value]) => {
      if (key === changedParameter.key) return;
      if (JSON.stringify(currentValues[key]) !== JSON.stringify(value)) {
        onParameterChange(key, value);
      }
    });
  };

  const inspectDependencyChange = (changedParameter, nextValue) =>
    inspectModelParameterDependencyChange({
      changedParameter,
      nextValue,
      parameterContext: currentContext,
    });

  return (
    <Box sx={addModelParameterColorScopeSx}>
      <Stack spacing={0.8}>
        <Typography variant="subtitle1" sx={{ fontWeight: "fontWeightBold" }}>
          Model parameters
        </Typography>

        {selectedModel ? (
          parameters.length ? (
            parameters.map((parameter, index) => {
              const groupInfo = parameterGroupsByKey.get(parameter.key);
              if (groupInfo) {
                if (parameter.key !== groupInfo.primaryParameterKey) return null;
                const GroupComponent = groupInfo.group.FieldComponent;
                return (
                  <GroupComponent
                    key={`${groupInfo.group.key}-${parameter.key}`}
                    parametersByStructureKey={groupInfo.parametersByStructureKey}
                    valuesByParameterKey={currentValues}
                    errorsByParameterKey={{}}
                    onChange={handleParameterChange}
                    inspectDependencyChange={inspectDependencyChange}
                    disabled={false}
                    parameterContext={currentContext}
                  />
                );
              }

              return (
                <ParameterFieldHost
                  key={`${parameter.key}-${index}`}
                  parameter={parameter}
                  value={currentValues[parameter.key]}
                  onChange={(value) => handleParameterChange(parameter, value)}
                  parameterContext={currentContext}
                  disabled={false}
                />
              );
            })
          ) : (
            <Typography color="text.secondary">
              This model has no parameters.
            </Typography>
          )
        ) : (
          <Typography color="text.secondary">
            Select an enabled model to load its registered parameters.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

export default ModelParametersFields;
