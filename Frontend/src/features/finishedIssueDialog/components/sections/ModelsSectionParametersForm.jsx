import { Stack, Typography } from "@mui/material";

import {
  getCreateIssueModelParameters,
  ParameterFieldHost,
} from "../../../modelParameters";
import ModelsSectionScenarioWeightsField from "./ModelsSectionScenarioWeightsField";
import { modelUsesScenarioCriteriaWeights } from "../../utils/finishedIssueDialog.utils";

const ModelsSectionParametersForm = ({
  model,
  values,
  setValues,
  leafNames,
  leafCriteria,
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

  const resolvedLeafCriteria = Array.isArray(leafCriteria) ? leafCriteria : [];
  const resolvedLeafNames = Array.isArray(leafNames) ? leafNames : [];

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
            context={{
              leafCriteria: resolvedLeafCriteria,
            }}
          />
        );
      })}

      <ModelsSectionScenarioWeightsField
        model={model}
        values={values}
        setValues={setValues}
        leafCriteria={resolvedLeafCriteria}
        leafNames={resolvedLeafNames}
        error={scenarioWeightsError}
        onClearError={clearScenarioWeightsError}
      />
    </Stack>
  );
};

export default ModelsSectionParametersForm;
