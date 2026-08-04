import { Stack, Typography, TextField } from "@mui/material";
import { numberGlobalParameterFieldSx } from "./styles/NumberGlobalParameterField.styles";

export const NumberGlobalParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
}) => {
  const { restrictions = {}, label, valueType } = parameter;
  const isInteger = valueType === "integer";
  const min = Number.isFinite(restrictions.min)
    ? restrictions.min
    : undefined;
  const max = Number.isFinite(restrictions.max)
    ? restrictions.max
    : undefined;

  return (
    <Stack spacing={0.35}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" sx={numberGlobalParameterFieldSx.label}>
          {label}:
        </Typography>

        <TextField
          type="number"
          variant="outlined"
          color="secondary"
          size="small"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          inputProps={{
            "aria-label": label,
            min,
            max,
            step: isInteger ? 1 : "any",
          }}
          sx={numberGlobalParameterFieldSx.input}
          disabled={disabled}
          error={Boolean(error)}
          helperText={error || ""}
        />
      </Stack>
    </Stack>
  );
};

export default NumberGlobalParameterField;
