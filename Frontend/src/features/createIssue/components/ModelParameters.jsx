import { useEffect, useMemo, useRef } from "react";
import { Stack, Typography, ToggleButton } from "@mui/material";

import { getLeafCriteria } from "../../../utils/criteria.utils";
import { resolveModelParameterAdapter } from "../../modelParameters";
import { useSnackbarAlertContext } from "../../../context/snackbarAlert/snackbarAlert.context";

const isCriteriaWeightLikeParameter = (parameter) =>
  ["criteriaWeights", "fuzzyCriteriaWeights"].includes(parameter?.parameterStructureKey) ||
  parameter?.semanticRole === "criteriaWeights";

export const getRenderableNormalModelParameters = (selectedModel) => {
  const parameters = Array.isArray(selectedModel?.parameters) ? selectedModel.parameters : [];

  return parameters.filter((parameter) => {
    if (!parameter?.key) return false;
    if (isCriteriaWeightLikeParameter(parameter)) return false;
    const { adapter, isSupported } = resolveModelParameterAdapter(parameter);
    return Boolean(isSupported && adapter?.FieldComponent);
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
}) => {
  const { showSnackbarAlert } = useSnackbarAlertContext();
  const hasShownUnsupportedRef = useRef(false);

  const leafCriteria = useMemo(() => {
    if (!Array.isArray(allData?.criteria)) return [];
    return getLeafCriteria(allData.criteria);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allData?.criteria)]);

  const renderableNormalParameters = useMemo(
    () => getRenderableNormalModelParameters(selectedModel),
    [selectedModel]
  );

  const hasUnsupportedParameters = useMemo(
    () =>
      (selectedModel?.parameters || []).some((parameter) => {
        if (isCriteriaWeightLikeParameter(parameter)) return false;
        const { isSupported } = resolveModelParameterAdapter(parameter);
        return Boolean(parameter?.key) && !isSupported;
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
        {renderableNormalParameters.map((parameter, index) => {
          const paramKey = parameter.key;

          const paramLabel = parameter?.label || paramKey || "Parameter";
          const { adapter } = resolveModelParameterAdapter(parameter);
          const FieldComponent = adapter.FieldComponent;

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
