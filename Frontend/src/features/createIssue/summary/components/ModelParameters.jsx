import { useMemo } from "react";
import { Stack, Typography, ToggleButton } from "@mui/material";

import { getLeafCriteria } from "../../../../utils/criteria.utils";
import { getCreateIssueModelParameters, ParameterFieldHost } from "../../../modelParameters";
import { buildModelParameterContext } from "../../../modelParameters/logic/buildModelParameterContext";

export const getRenderableNormalModelParameters = (selectedModel) =>
  getCreateIssueModelParameters(selectedModel);

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
      buildModelParameterContext({
        leafCriteria,
        leafNames: leafCriteria.map((criterion) => criterion?.name).filter(Boolean),
        alternatives: Array.isArray(allData?.alternatives) ? allData.alternatives : [],
      }),
    [allData?.alternatives, leafCriteria]
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
                context={parameterContext}
              />
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default ModelParameters;
