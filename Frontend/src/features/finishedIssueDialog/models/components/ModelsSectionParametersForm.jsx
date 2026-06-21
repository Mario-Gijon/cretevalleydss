import { Stack, Typography } from "@mui/material";

import {
  getCreateIssueModelParameters,
  ParameterFieldHost,
} from "../../../modelParameters";
import ModelsSectionScenarioWeightsField from "./ModelsSectionScenarioWeightsField";
import { modelUsesScenarioCriteriaWeights } from "../../logic/buildFinishedScenarioParameters";

const ModelsSectionParametersForm = ({
  model,
  values,
  setValues,
  parameterContext,
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
            parameterContext={parameterContext}
          />
        );
      })}

      <ModelsSectionScenarioWeightsField
        model={model}
        values={values}
        setValues={setValues}
        leafCriteria={parameterContext.leafCriteria}
        error={scenarioWeightsError}
        onClearError={clearScenarioWeightsError}
      />
    </Stack>
  );
};

export default ModelsSectionParametersForm;
