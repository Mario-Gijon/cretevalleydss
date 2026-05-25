import { Stack, Typography } from "@mui/material";

import {
  getCreateIssueModelParameters,
  ParameterFieldHost,
} from "../../../modelParameters";

const ModelsSectionParametersForm = ({
  model,
  values,
  setValues,
  leafCriteria,
}) => {
  if (!model) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        Select a model to configure its parameters.
      </Typography>
    );
  }

  const params = getCreateIssueModelParameters(model);
  if (params.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 850 }}>
        This model has no parameters.
      </Typography>
    );
  }

  const resolvedLeafCriteria = Array.isArray(leafCriteria) ? leafCriteria : [];

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
    </Stack>
  );
};

export default ModelsSectionParametersForm;
