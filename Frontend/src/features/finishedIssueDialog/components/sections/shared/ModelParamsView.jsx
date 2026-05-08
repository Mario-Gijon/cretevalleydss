import { useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ModelParameterReadOnlyView } from "../../../../modelParameters/ModelParameterReadOnlyView";

const normalizeParamKey = (parameter) => parameter?.key || "";
const normalizeParamLabel = (parameter) => parameter?.label || normalizeParamKey(parameter);

const hasRealValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

const ParamRow = ({ name, children }) => {
  const theme = useTheme();

  return (
    <Box sx={{ py: 0.85 }}>
      <Stack spacing={0.5}>
        <Typography variant="body2" sx={{ fontWeight: 950, color: "text.secondary" }}>
          {name}
        </Typography>

        <Box
          sx={{
            px: 1.1,
            py: 0.9,
            borderRadius: 3,
            bgcolor: alpha("#0B1118", 0.35),
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {children}
        </Box>
      </Stack>
    </Box>
  );
};

export const ModelParamsView = ({ parameters, values, leafNames }) => {
  const params = useMemo(() => (Array.isArray(parameters) ? parameters : []), [parameters]);
  const has = Array.isArray(params) && params.length;

  const visibleParams = useMemo(() => {
    const hasObjectValue = values && typeof values === "object" && !Array.isArray(values);

    return params.filter((parameter) => {
      const key = normalizeParamKey(parameter);
      if (!key) return false;
      const currentValue = hasObjectValue ? values?.[key] : undefined;
      const fallback = parameter?.default;
      return hasRealValue(currentValue) || hasRealValue(fallback);
    });
  }, [params, values]);

  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      {!has || visibleParams.length === 0 ? (
        <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary", px: 0.25 }}>
          No parameters.
        </Typography>
      ) : (
        <Box>
          {visibleParams.map((parameter) => {
            const key = normalizeParamKey(parameter);
            if (!key) return null;

            const label = normalizeParamLabel(parameter);
            const value = values?.[key] ?? parameter?.default;

            return (
              <ParamRow key={parameter?._id || key} name={label}>
                <ModelParameterReadOnlyView
                  parameter={parameter}
                  value={value}
                  leafNames={leafNames}
                />
              </ParamRow>
            );
          })}
        </Box>
      )}
    </Stack>
  );
};

export default ModelParamsView;
