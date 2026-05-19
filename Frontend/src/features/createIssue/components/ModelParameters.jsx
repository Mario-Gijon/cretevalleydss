import { useEffect, useMemo, useRef } from "react";
import { Stack, Typography, ToggleButton } from "@mui/material";

import { getLeafCriteria } from "../../../utils/criteria.utils";
import { resolveModelParameterAdapter } from "../../modelParameters";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";

export const ModelParameters = ({
  selectedModel,
  allData,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  handleDefaultChange,
  showValidationErrors = false,
}) => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const hasShownUnsupportedRef = useRef(false);

  const leafCriteria = useMemo(() => {
    if (!Array.isArray(allData?.criteria)) return [];
    return getLeafCriteria(allData.criteria);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allData?.criteria)]);

  const hasUnsupportedParameters = useMemo(
    () =>
      (selectedModel?.parameters || []).some((parameter) => {
        const { isSupported } = resolveModelParameterAdapter(parameter);
        return !isSupported;
      }),
    [selectedModel?.parameters]
  );

  useEffect(() => {
    if (!hasUnsupportedParameters) {
      hasShownUnsupportedRef.current = false;
      return;
    }

    if (hasShownUnsupportedRef.current) return;
    showSnackbarAlert("No se pudieron mostrar los parámetros del modelo.", "error");
    hasShownUnsupportedRef.current = true;
  }, [hasUnsupportedParameters, showSnackbarAlert]);

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
          const paramKey = parameter?.key;
          if (!paramKey) return null;

          const paramLabel = parameter?.label || paramKey || "Parameter";
          const { adapter, registryKey } = resolveModelParameterAdapter(parameter);
          const FieldComponent = adapter?.FieldComponent || null;

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
