import { useMemo } from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { ModelParameterReadOnlyView } from "./ModelParameterReadOnlyView";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const normalizeParamKey = (parameter) => parameter?.key || "";
const normalizeParamLabel = (parameter) => parameter?.label || normalizeParamKey(parameter);

const hasRealValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
};

const formatPrimitive = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
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
            bgcolor: alpha(theme.palette.background.paper, 0.35),
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {children}
        </Box>
      </Stack>
    </Box>
  );
};

const RawValueView = ({ paramKey, value, leafNames }) => {
  if (Array.isArray(value)) {
    return (
      <Stack direction="row" flexWrap="wrap" gap={0.75}>
        {value.map((item, index) => (
          <Chip key={`${paramKey}-${index}`} size="small" label={formatPrimitive(item)} />
        ))}
      </Stack>
    );
  }

  if (isPlainObject(value)) {
    return (
      <Box
        component="pre"
        sx={{
          m: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Box>
    );
  }

  return <Typography variant="body2" sx={{ fontWeight: 850 }}>{formatPrimitive(value)}</Typography>;
};

export const IssueModelParametersView = ({ parameters, values, leafNames }) => {
  const params = useMemo(() => (Array.isArray(parameters) ? parameters : []), [parameters]);
  const valuesObject = useMemo(
    () => (isPlainObject(values) ? values : {}),
    [values]
  );

  const declaredKeys = useMemo(
    () =>
      new Set(
        params
          .map((parameter) => normalizeParamKey(parameter))
          .filter(Boolean)
      ),
    [params]
  );

  const visibleDeclaredParams = useMemo(() => {
    return params.filter((parameter) => {
      const key = normalizeParamKey(parameter);
      if (!key) return false;

      const hasCurrentValue = Object.prototype.hasOwnProperty.call(valuesObject, key);
      const currentValue = hasCurrentValue ? valuesObject[key] : undefined;
      const fallbackValue = parameter?.default;

      return hasRealValue(currentValue) || hasRealValue(fallbackValue);
    });
  }, [params, valuesObject]);

  const extraEntries = useMemo(() => {
    return Object.keys(valuesObject)
      .filter((key) => !declaredKeys.has(key))
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, valuesObject[key]]);
  }, [declaredKeys, valuesObject]);

  if (visibleDeclaredParams.length === 0 && extraEntries.length === 0) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 850, color: "text.secondary", px: 0.25 }}>
        No parameters.
      </Typography>
    );
  }

  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      <Box>
        {visibleDeclaredParams.map((parameter) => {
          const key = normalizeParamKey(parameter);
          if (!key) return null;

          const label = normalizeParamLabel(parameter);
          const value = Object.prototype.hasOwnProperty.call(valuesObject, key)
            ? valuesObject[key]
            : parameter?.default;

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

        {extraEntries.map(([key, value]) => (
          <ParamRow key={`extra-${key}`} name={key}>
            <RawValueView paramKey={key} value={value} leafNames={leafNames} />
          </ParamRow>
        ))}
      </Box>
    </Stack>
  );
};

export default IssueModelParametersView;
