import { useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ParameterReadOnlyHost from "./ParameterReadOnlyHost";
import { isPlainObject } from "../logic/isPlainObject";

const getParameterKey = (parameter) => parameter.key;
const getParameterLabel = (parameter) => parameter.label || parameter.key;

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

const formatWeight = (value) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return formatPrimitive(value);
  }

  return Number(numberValue.toFixed(3)).toString();
};

const ParamRow = ({ name, children }) => {
  const theme = useTheme();

  return (
    <Box sx={{ py: 0.85 }}>
      <Stack spacing={0.5}>
        <Typography variant="body2" sx={{ fontWeight: 800, color: "text.secondary" }}>
          {name}
        </Typography>

        <Box
          sx={{
            px: 1.1,
            py: 0.9,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.background.paper, 0.22),
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {children}
        </Box>
      </Stack>
    </Box>
  );
};

const RawWeightsView = ({ value, leafNames }) => {
  if (!Array.isArray(value)) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        {formatPrimitive(value)}
      </Typography>
    );
  }

  const labels = value.map((_, index) => {
    const criterionName = Array.isArray(leafNames) ? leafNames[index] : null;
    return criterionName || `Criterion ${index + 1}`;
  });

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "max-content max-content",
        columnGap: 1.25,
        rowGap: 0.45,
        alignItems: "center",
        width: "fit-content",
      }}
    >
      {value.map((weight, index) => (
        <Box
          key={`${labels[index]}-${index}`}
          sx={{
            display: "contents",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {labels[index]}:
          </Typography>

          <Typography
            variant="body2"
            sx={{
              fontWeight: 850,
              whiteSpace: "nowrap",
            }}
          >
            {formatWeight(weight)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const RawValueView = ({ paramKey, value, leafNames }) => {
  if (paramKey === "weights") {
    return <RawWeightsView value={value} leafNames={leafNames} />;
  }

  if (Array.isArray(value)) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 800 }}>
        {value.map(formatPrimitive).join(", ")}
      </Typography>
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

  return (
    <Typography variant="body2" sx={{ fontWeight: 800 }}>
      {formatPrimitive(value)}
    </Typography>
  );
};

export const IssueModelParametersView = ({ parameters, values, leafNames }) => {
  const params = useMemo(() => (Array.isArray(parameters) ? parameters : []), [parameters]);
  const valuesObject = useMemo(() => (isPlainObject(values) ? values : {}), [values]);

  const declaredKeys = useMemo(
    () => new Set(params.map((parameter) => getParameterKey(parameter))),
    [params]
  );

  const visibleDeclaredParams = useMemo(() => {
    return params.filter((parameter) => {
      const key = getParameterKey(parameter);
      const hasCurrentValue = Object.prototype.hasOwnProperty.call(valuesObject, key);
      const currentValue = hasCurrentValue ? valuesObject[key] : undefined;
      const fallbackValue = parameter.default;

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
          const key = getParameterKey(parameter);
          const label = getParameterLabel(parameter);
          const value = Object.prototype.hasOwnProperty.call(valuesObject, key)
            ? valuesObject[key]
            : parameter.default;

          return (
            <ParamRow key={parameter._id || key} name={label}>
              <ParameterReadOnlyHost
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
