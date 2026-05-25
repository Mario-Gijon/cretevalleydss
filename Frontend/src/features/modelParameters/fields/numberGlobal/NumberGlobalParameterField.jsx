import { Stack, Typography, TextField, MenuItem } from "@mui/material";
import { handleNumberInput } from "../../../../utils/handleTwoDecimals";

const toAllowedList = (parameter) => {
  const allowed = parameter?.restrictions?.allowed;
  return Array.isArray(allowed) ? allowed : [];
};

export const NumberGlobalParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
}) => {
  const restrictions = parameter?.restrictions || {};
  const allowed = toAllowedList(parameter);
  const label = parameter?.label || parameter?.key || "Parameter";
  const isInteger = parameter?.type === "integer" || parameter?.valueType === "integer";

  if (allowed.length > 0) {
    return (
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body1">{label}:</Typography>
        <TextField
          select
          size="small"
          value={value ?? ""}
          onChange={(event) => {
            onChange(handleNumberInput(event.target.value));
          }}
          inputProps={{ min: restrictions?.min ?? undefined, max: restrictions?.max ?? undefined }}
          sx={{ minWidth: 80 }}
          disabled={disabled}
          error={Boolean(error)}
          helperText={error || " "}
        >
          {allowed.map((option) => (
            <MenuItem key={String(option)} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body1">{label}:</Typography>
      <TextField
        type="number"
        size="small"
        value={value ?? ""}
        onChange={(event) => {
          const raw = event.target.value;
          if (isInteger) {
            const parsed = raw === "" ? "" : Math.trunc(Number(raw));
            onChange(Number.isFinite(parsed) ? parsed : "");
            return;
          }

          onChange(handleNumberInput(raw));
        }}
        inputProps={{
          min: restrictions?.min ?? undefined,
          max: restrictions?.max ?? undefined,
          step: isInteger ? 1 : 0.1,
        }}
        sx={{ maxWidth: isInteger ? 100 : 80 }}
        disabled={disabled}
        error={Boolean(error)}
        helperText={error || " "}
      />
    </Stack>
  );
};

export default NumberGlobalParameterField;
