import { Stack, Typography, TextField, MenuItem } from "@mui/material";

const FIELD_HEIGHT = 36;

const requireAllowedValues = (parameter) => {
  const allowed = parameter.restrictions?.allowed;

  if (!Array.isArray(allowed)) {
    throw new Error(
      `[modelParameters] Missing allowed values for global parameter "${parameter.key}".`
    );
  }

  return allowed;
};

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
  const allowed = requireAllowedValues(parameter);
  const { label } = parameter;

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
            <MenuItem key={option} value={option}>
              {option}
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
