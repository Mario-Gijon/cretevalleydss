import { useMemo } from "react";
import { Stack, Typography, ToggleButton } from "@mui/material";

import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { buildParameterContext } from "../../../modelParameters/context";
import { ParameterFieldHost } from "../../../modelParameters/rendering";
import { validateModelParameterValues } from "../../../modelParameters/validation";
import { reconcileModelParameterDependencyChange } from "../../../modelParameters/logic/reconcileModelParameterDependencyChange.js";
import { getRenderableNormalModelParameters } from "../logic/getRenderableNormalModelParameters";
import { buildCreateIssueParameterDefaults } from "../../../modelParameters/draft";
import { resolveParameterFieldEntry } from "../../../decisionPlugins/modelParameters";
import { inspectModelParameterDependencyChange } from "../../../modelParameters/logic/inspectModelParameterDependencyChange.js";

export const ModelParameters = ({
  selectedModel,
  allData,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  validationAttempted = false,
  handleDefaultChange,
  globalDomains = [],
  expressionDomains = [],
  expressionDomainConfig = null,
}) => {
  const leafCriteria = useMemo(() => {
    if (!Array.isArray(allData?.criteria)) return [];
    return getLeafCriteria(allData.criteria);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allData?.criteria)]);

  const renderableNormalParameters = useMemo(
    () => getRenderableNormalModelParameters(selectedModel),
    [selectedModel]
  );
  const parameterContext = useMemo(
    () =>
      buildParameterContext({
        model: selectedModel
          ? {
              id: selectedModel.id || selectedModel._id || null,
              name: selectedModel.name || null,
              apiModelKey: selectedModel.apiModelKey || null,
            }
          : null,
        criteriaTree: Array.isArray(allData?.criteria) ? allData.criteria : [],
        leafCriteria,
        alternatives: Array.isArray(allData?.alternatives) ? allData.alternatives : [],
        parameterDefinitions: Array.isArray(selectedModel?.parameters) ? selectedModel.parameters : [],
        parameterValues: paramValues,
        expressionDomainConfig,
        expressionDomains: [...globalDomains, ...expressionDomains],
      }),
    [allData?.alternatives, allData?.criteria, expressionDomainConfig, expressionDomains, globalDomains, leafCriteria, paramValues, selectedModel]
  );
  const parameterErrors = useMemo(
    () => validateModelParameterValues({
      parameters: renderableNormalParameters,
      values: paramValues,
      parameterContext,
    }),
    [parameterContext, paramValues, renderableNormalParameters]
  );
  const defaultValues = useMemo(
    () => buildCreateIssueParameterDefaults({ selectedModel }),
    [selectedModel]
  );
  const defaultParameterContext = useMemo(
    () => buildParameterContext({
      model: parameterContext.model,
      alternatives: parameterContext.alternatives,
      criteriaTree: parameterContext.criteriaTree,
      leafCriteria,
      parameterDefinitions: renderableNormalParameters,
      parameterValues: defaultValues,
      criterionDomainsById: parameterContext.criterionDomainsById,
    }),
    [defaultValues, leafCriteria, parameterContext, renderableNormalParameters]
  );
  const defaultParameterErrors = useMemo(
    () => validateModelParameterValues({
      parameters: renderableNormalParameters,
      values: defaultValues,
      parameterContext: defaultParameterContext,
    }),
    [defaultParameterContext, defaultValues, renderableNormalParameters]
  );
  const hasRequiredDefaults = renderableNormalParameters.every((parameter) =>
    parameter.required !== true || Object.hasOwn(parameter, "default")
  );
  const defaultsAvailable = hasRequiredDefaults && Object.keys(defaultParameterErrors).length === 0;
  const hasParameterErrors = Object.keys(parameterErrors).length > 0;
  const parameterGroupsByKey = useMemo(() => {
    const parametersByStructureKey = new Map(
      renderableNormalParameters.map((parameter) => [parameter.parameterStructureKey, parameter])
    );
    const groups = new Map();
    renderableNormalParameters.forEach((parameter) => {
      const group = resolveParameterFieldEntry(parameter).parameterGroup;
      if (!group || !group.memberStructureKeys.every((key) => parametersByStructureKey.has(key))) return;
      const groupParametersByStructureKey = Object.fromEntries(
        group.memberStructureKeys.map((key) => [key, parametersByStructureKey.get(key)])
      );
      const groupInfo = {
        group,
        parametersByStructureKey: groupParametersByStructureKey,
        primaryParameterKey: parameter.key,
      };
      group.memberStructureKeys.forEach((key) => {
        groups.set(groupParametersByStructureKey[key].key, groupInfo);
      });
    });
    return groups;
  }, [renderableNormalParameters]);

  const updateParameterValue = (parameter, nextValue) => {
    setParamValues((previous) => {
      const next = { ...previous, [parameter.key]: nextValue };
      const previousContext = buildParameterContext({
        ...parameterContext,
        parameterValues: previous,
      });
      const nextContext = buildParameterContext({
        ...parameterContext,
        parameterValues: next,
      });
      return reconcileModelParameterDependencyChange({
        changedParameter: parameter,
        parameters: renderableNormalParameters,
        nextValues: next,
        previousContext,
        nextContext,
      });
    });

    if (defaultModelParams) setDefaultModelParams(false);
  };
  const inspectDependencyChange = (parameter, nextValue) =>
    inspectModelParameterDependencyChange({
      changedParameter: parameter,
      nextValue,
      parameterContext,
    });

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.75, sm: 2 }} sx={{ mb: 1 }} alignItems={{ sm: "center" }}>
        {defaultsAvailable ? (
          <ToggleButton
            value="default"
            selected={defaultModelParams && defaultsAvailable}
            onChange={handleDefaultChange}
            color="secondary"
            size="small"
          >
            Default
          </ToggleButton>
        ) : null}
        <Typography variant="caption" color={hasParameterErrors ? "text.secondary" : "success.main"}>
          {defaultModelParams && defaultsAvailable
            ? "Using valid default values."
            : hasParameterErrors
              ? validationAttempted
                ? "Review the highlighted model settings."
                : "Complete the required settings before creating this Issue."
              : "Custom settings are ready."}
        </Typography>
      </Stack>

      <Stack spacing={2} sx={{ width: "100%" }}>
        {renderableNormalParameters.map((parameter, index) => {
          const parameterKey = parameter.key;
          const groupInfo = parameterGroupsByKey.get(parameterKey);
          if (groupInfo) {
            if (parameterKey !== groupInfo.primaryParameterKey) return null;
            const GroupComponent = groupInfo.group.FieldComponent;
            return (
              <GroupComponent
                key={`${groupInfo.group.key}-${parameterKey}`}
                parametersByStructureKey={groupInfo.parametersByStructureKey}
                valuesByParameterKey={paramValues || {}}
                errorsByParameterKey={parameterErrors}
                onChange={updateParameterValue}
                inspectDependencyChange={inspectDependencyChange}
                disabled={false}
                showValidation={validationAttempted}
                parameterContext={parameterContext}
              />
            );
          }

          return (
            <Stack key={`${parameterKey}-${index}`} sx={{ minWidth: 0 }}>
              <ParameterFieldHost
                parameter={parameter}
                value={paramValues?.[parameterKey]}
                onChange={(nextValue) => updateParameterValue(parameter, nextValue)}
                disabled={false}
                showValidation={validationAttempted}
                parameterContext={parameterContext}
                error={parameterErrors[parameterKey] || ""}
              />
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default ModelParameters;
