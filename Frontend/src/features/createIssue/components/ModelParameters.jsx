import { useMemo } from "react";
import { Stack, Typography, ToggleButton } from "@mui/material";
import { getLeafCriteria } from "../../../utils/criteria.utils";
import { resolveParameterKey, resolveModelParameterField } from "../../modelParameters";

export const ModelParameters = ({
  selectedModel,
  allData,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  handleDefaultChange,
  showValidationErrors = false,
  weightingMode,
  setWeightingMode,
  bwmData,
  setBwmData,
}) => {
  const leafCriteria = useMemo(() => {
    if (!Array.isArray(allData?.criteria)) return [];
    return getLeafCriteria(allData.criteria);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allData?.criteria)]);

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
        {(selectedModel?.parameters || []).map((parameter, index) => {
          const paramKey = resolveParameterKey(parameter);
          if (!paramKey) return null;

          const paramLabel = parameter?.label || paramKey || "Parameter";
          const { FieldComponent, registryKey } = resolveModelParameterField(parameter);

          if (!FieldComponent) {
            return (
              <Stack key={`${paramKey}-${index}`} spacing={1} sx={{ minWidth: 260 }}>
                <Typography variant="body1">{paramLabel}:</Typography>
                <Typography variant="caption" color="error">
                  Unsupported parameter renderer for `{registryKey}`.
                </Typography>
              </Stack>
            );
          }

          return (
            <Stack key={`${paramKey}-${index}`}>
              <FieldComponent
                parameter={parameter}
                paramKey={paramKey}
                paramLabel={paramLabel}
                paramValues={paramValues}
                setParamValues={setParamValues}
                defaultModelParams={defaultModelParams}
                setDefaultModelParams={setDefaultModelParams}
                leafCriteria={leafCriteria}
                weightingMode={weightingMode}
                setWeightingMode={setWeightingMode}
                bwmData={bwmData}
                setBwmData={setBwmData}
                showValidationErrors={showValidationErrors}
              />
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
};

export default ModelParameters;
