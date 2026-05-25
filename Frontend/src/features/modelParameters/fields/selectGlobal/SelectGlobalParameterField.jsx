import { Stack, Typography, TextField, MenuItem } from "@mui/material";

const FIELD_HEIGHT = 36;

const readAllowedValues = (parameter) =>
  Array.isArray(parameter?.restrictions?.allowed) ? parameter.restrictions.allowed : [];

const labelSx = {
  height: FIELD_HEIGHT,
  display: "flex",
  alignItems: "center",
  color: "text.secondary",
  fontWeight: 750,
  whiteSpace: "nowrap",
  lineHeight: 1,
};

const textFieldSx = {
  minWidth: 128,
  "& .MuiOutlinedInput-root": {
    height: FIELD_HEIGHT,
  },
  "& .MuiSelect-select": {
    py: 0,
    display: "flex",
    alignItems: "center",
  },
};

export const SelectGlobalParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
}) => {
  const allowed = readAllowedValues(parameter);
  const label = parameter?.label || parameter?.key || "Parameter";

  return (
    <Stack spacing={0.35}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" sx={labelSx}>
          {label}:
        </Typography>

        <TextField
          select
          variant="outlined"
          color="secondary"
          size="small"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          sx={textFieldSx}
          disabled={disabled}
          error={Boolean(error)}
        >
          {allowed.map((option) => (
            <MenuItem key={String(option)} value={option}>
              {String(option)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default SelectGlobalParameterField;