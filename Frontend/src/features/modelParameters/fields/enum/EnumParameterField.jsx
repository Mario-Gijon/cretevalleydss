import { Stack, Typography, TextField, MenuItem } from "@mui/material";

export const EnumParameterField = ({
  parameter,
  paramKey,
  paramLabel,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
}) => {
  const restrictions = parameter?.restrictions || {};
  const defaultValue = parameter?.default;
  const valueType = String(parameter?.valueType || "").trim().toLowerCase();
  const allowed = Array.isArray(restrictions?.allowed) ? restrictions.allowed : [];
  const normalizeInputValue = (rawValue) => {
    if (valueType === "number") {
      const parsed = Number(rawValue);
      return Number.isFinite(parsed) ? parsed : rawValue;
    }

    if (valueType === "integer") {
      const parsed = Number(rawValue);
      return Number.isInteger(parsed) ? parsed : rawValue;
    }

    if (valueType === "boolean") {
      if (rawValue === true || rawValue === false) return rawValue;
      const normalized = String(rawValue).trim().toLowerCase();
      if (normalized === "true") return true;
      if (normalized === "false") return false;
    }

    return rawValue;
  };

  if (parameter?.type === "boolean") {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body1">{paramLabel}:</Typography>
        <TextField
          select
          size="small"
          value={paramValues[paramKey] ?? defaultValue ?? ""}
          onChange={(e) => {
            setParamValues((prev) => ({
              ...prev,
              [paramKey]: normalizeInputValue(e.target.value),
            }));
            if (defaultModelParams) setDefaultModelParams(false);
          }}
          sx={{ minWidth: 100 }}
        >
          <MenuItem value={true}>True</MenuItem>
          <MenuItem value={false}>False</MenuItem>
        </TextField>
      </Stack>
    );
  }

  if (allowed.length > 0) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body1">{paramLabel}:</Typography>
        <TextField
          select
          size="small"
          value={paramValues[paramKey] ?? defaultValue ?? ""}
          onChange={(e) => {
            setParamValues((prev) => ({
              ...prev,
              [paramKey]: normalizeInputValue(e.target.value),
            }));
            if (defaultModelParams) setDefaultModelParams(false);
          }}
          sx={{ minWidth: 140 }}
        >
          {allowed.map((val) => (
            <MenuItem key={val} value={val}>
              {val}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body1">{paramLabel}:</Typography>
      <TextField
        size="small"
        value={paramValues[paramKey] ?? defaultValue ?? ""}
        onChange={(e) => {
          setParamValues((prev) => ({
            ...prev,
            [paramKey]: normalizeInputValue(e.target.value),
          }));
          if (defaultModelParams) setDefaultModelParams(false);
        }}
        sx={{ minWidth: 180 }}
      />
    </Stack>
  );
};

export default EnumParameterField;
