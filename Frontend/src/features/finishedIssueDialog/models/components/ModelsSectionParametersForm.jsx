import { Stack, Typography } from "@mui/material";

import {
  getCreateIssueModelParameters,
  ParameterFieldHost,
} from "../../../modelParameters";
import { buildModelParameterContext } from "../../../modelParameters/logic/buildModelParameterContext";
import ModelsSectionScenarioWeightsField from "./ModelsSectionScenarioWeightsField";
import { modelUsesScenarioCriteriaWeights } from "../../logic/buildFinishedScenarioParameters";

const ModelsSectionParametersForm = ({
  model,
  values,
  setValues,
  context,
  scenarioWeightsError = "",
  clearScenarioWeightsError,
}) => {
  if (!model) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        Select a model to configure its parameters.
      </Typography>
    );
  }

  const params = getCreateIssueModelParameters(model);
  const showWeightsField = modelUsesScenarioCriteriaWeights(model);
  if (params.length === 0 && !showWeightsField) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        This model has no parameters.
      </Typography>
    );
  }

  const parameterContext = buildModelParameterContext({
    leafCriteria: Array.isArray(context?.leafCriteria) ? context.leafCriteria : [],
    leafNames: Array.isArray(context?.leafNames) ? context.leafNames : [],
    alternatives: Array.isArray(context?.alternatives) ? context.alternatives : [],
  });

  return (
    <Stack spacing={2}>
      {params.map((parameter, index) => {
        const paramKey = parameter?.key;
        if (!paramKey) return null;

        return (
          <ParameterFieldHost
            key={`${paramKey}-${index}`}
            parameter={parameter}
            value={values?.[paramKey]}
            onChange={(nextValue) => {
              setValues((previous) => ({
                ...(previous || {}),
                [paramKey]: nextValue,
              }));
            }}
            disabled={false}
            context={parameterContext}
          />
        );
      })}

      <ModelsSectionScenarioWeightsField
        model={model}
        values={values}
        setValues={setValues}
        leafCriteria={parameterContext.leafCriteria}
        leafNames={parameterContext.leafNames}
        error={scenarioWeightsError}
        onClearError={clearScenarioWeightsError}
      />
    </Stack>
  );
};

export default ModelsSectionParametersForm;
