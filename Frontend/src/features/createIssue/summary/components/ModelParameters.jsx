import { useMemo } from "react";
import { Stack, Typography, ToggleButton } from "@mui/material";

import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { ParameterFieldHost } from "../../../modelParameters";
import { buildParameterContext } from "../../../modelParameters/logic/buildModelParameterContext";
import { getRenderableNormalModelParameters } from "../logic/getRenderableNormalModelParameters";

export const ModelParameters = ({
  selectedModel,
  allData,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  handleDefaultChange,
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
      }),
    [allData?.alternatives, allData?.criteria, leafCriteria, selectedModel]
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

      <Stack spacing={2} sx={{ width: "100%" }}>
        {renderableNormalParameters.map((parameter, index) => {
          const parameterKey = parameter.key;

          return (
            <Stack key={`${parameterKey}-${index}`} sx={{ minWidth: 0 }}>
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
                disabled={false}
                parameterContext={parameterContext}
              />
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default ModelParameters;
