import { Stack, Typography, TextField, MenuItem } from "@mui/material";
import { selectGlobalParameterFieldSx } from "./styles/SelectGlobalParameterField.styles";

const getOptionKey = (option) => `${typeof option}:${String(option)}`;

export const SelectGlobalParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
}) => {
  const allowed = Array.isArray(parameter?.restrictions?.allowed)
    ? parameter.restrictions.allowed
    : [];
  const label = parameter?.label || "Selection";

  return (
    <Stack spacing={0.35}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" sx={selectGlobalParameterFieldSx.label}>
          {label}:
        </Typography>

        <TextField
          select
          variant="outlined"
          color="secondary"
          size="small"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          inputProps={{ "aria-label": label }}
          sx={selectGlobalParameterFieldSx.input}
          disabled={disabled || allowed.length === 0}
          error={Boolean(error)}
          helperText={error || ""}
        >
          {allowed.map((option, index) => (
            <MenuItem key={`${getOptionKey(option)}:${index}`} value={option}>
              {String(option)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Stack>
  );
};

export default SelectGlobalParameterField;
