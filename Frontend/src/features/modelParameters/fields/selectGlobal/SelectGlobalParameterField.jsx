import { Stack, Typography, TextField, MenuItem } from "@mui/material";

const readAllowedValues = (parameter) =>
  Array.isArray(parameter?.restrictions?.allowed) ? parameter.restrictions.allowed : [];

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
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body1">{label}:</Typography>
      <TextField
        select
        size="small"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        sx={{ minWidth: 140 }}
        disabled={disabled}
        error={Boolean(error)}
        helperText={error || " "}
      >
        {allowed.map((option) => (
          <MenuItem key={String(option)} value={option}>
            {String(option)}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
};

export default SelectGlobalParameterField;
