import { useMemo } from "react";
import { Stack, Typography, ToggleButton } from "@mui/material";

import { getLeafCriteria } from "../../../utils/criteria.utils";
import {
  getCreateIssueModelParameters,
  ParameterFieldHost,
  resolveParameterStructure,
} from "../../modelParameters";

export const getRenderableNormalModelParameters = (selectedModel) => {
  return getCreateIssueModelParameters(selectedModel).filter((parameter) => {
    resolveParameterStructure(parameter);
    return true;
  });
};

export const ModelParameters = ({
  selectedModel,
  allData,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  handleDefaultChange,
  showValidationErrors = false,
  parameterErrors = {},
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

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          Model parameters:
        </Typography>

        <ToggleButton
          value="default"
          selected={defaultModelParams}
          onChange={handleDefaultChange}
          color="secondary"
          size="small"
        >
          Default
        </ToggleButton>
      </Stack>

      <Stack gap={3} direction={{ xs: "column", md: "row" }} flexWrap="wrap">
        {renderableNormalParameters.map((parameter, index) => {
          const parameterKey = parameter.key;

          return (
            <Stack key={`${parameterKey}-${index}`}>
              <ParameterFieldHost
                parameter={parameter}
                value={paramValues?.[parameterKey]}
                onChange={(nextValue) => {
                  setParamValues((previous) => ({
                    ...previous,
                    [parameterKey]: nextValue,
                  }));

                  if (defaultModelParams) {
                    setDefaultModelParams(false);
                  }
                }}
                error={showValidationErrors ? parameterErrors?.[parameterKey] : ""}
                disabled={false}
                context={{
                  leafCriteria,
                }}
              />
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default ModelParameters;
