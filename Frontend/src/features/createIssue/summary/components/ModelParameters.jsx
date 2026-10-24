import { useMemo } from "react";
import { Stack, Typography, ToggleButton } from "@mui/material";

import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { buildParameterContext } from "../../../modelParameters/context";
import { ParameterFieldHost } from "../../../modelParameters/rendering";
import { validateModelParameterValues } from "../../../modelParameters/validation";
import { reconcileModelParameterDependencyChange } from "../../../modelParameters/logic/reconcileModelParameterDependencyChange.js";
import { getRenderableNormalModelParameters } from "../logic/getRenderableNormalModelParameters";
import { buildCreateIssueParameterDefaults } from "../../../modelParameters/draft";

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

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.75, sm: 2 }} sx={{ mb: 1 }} alignItems={{ sm: "center" }}>
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Model parameters
        </Typography>

        <ToggleButton
          value="default"
          selected={defaultModelParams && defaultsAvailable}
          onChange={handleDefaultChange}
          color="secondary"
          size="small"
          disabled={!defaultsAvailable}
        >
          Default
        </ToggleButton>
        <Typography variant="caption" color={hasParameterErrors ? "text.secondary" : "success.main"}>
          {defaultModelParams && defaultsAvailable
            ? "Using valid default values."
            : hasParameterErrors
              ? validationAttempted
                ? "Review the highlighted model settings."
                : defaultsAvailable
                  ? "Complete the required settings before creating this Issue."
                  : "No valid defaults are available. Complete the required settings below."
              : defaultsAvailable
                ? "Custom settings are ready."
                : "Custom settings are ready. No valid defaults are available."}
        </Typography>
      </Stack>

      <Stack spacing={2} sx={{ width: "100%" }}>
        {renderableNormalParameters.map((parameter, index) => {
          const parameterKey = parameter.key;

          return (
            <Stack key={`${parameterKey}-${index}`} sx={{ minWidth: 0 }}>
              <ParameterFieldHost
                parameter={parameter}
                value={paramValues?.[parameterKey]}
                onChange={(nextValue) => {
                  setParamValues((previous) => {
                    const next = {
                      ...previous,
                      [parameterKey]: nextValue,
                    };
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

                  if (defaultModelParams) {
                    setDefaultModelParams(false);
                  }
                }}
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
