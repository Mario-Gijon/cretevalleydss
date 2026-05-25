import { Stack, Typography, TextField } from "@mui/material";
import { handleNumberInput } from "../../../../utils/handleTwoDecimals";

const ensureLength = (value) => {
  const normalized = Array.isArray(value) ? [...value] : [];
  if (normalized.length < 2) return [...normalized, ...Array(2 - normalized.length).fill("")];
  return normalized.slice(0, 2);
};

export const IntervalGlobalParameterField = ({
  parameter,
  value,
  onChange,
  disabled = false,
  error = "",
}) => {
  const restrictions = parameter?.restrictions || {};
  const label = parameter?.label || parameter?.key || "Parameter";
  const currentValues = ensureLength(value);

  return (
    <Stack spacing={1} direction="row" alignItems="center">
      <Typography variant="body1">{label}:</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h5">[</Typography>
        {currentValues.map((item, index) => (
          <TextField
            key={index}
            type="number"
            size="small"
            value={item}
            onChange={(event) => {
              const next = [...currentValues];
              next[index] = handleNumberInput(event.target.value);
              onChange(next);
            }}
            inputProps={{
              min: restrictions?.min ?? undefined,
              max: restrictions?.max ?? undefined,
              step: 0.1,
            }}
            sx={{ width: 80 }}
            disabled={disabled}
            error={Boolean(error)}
          />
        ))}
        <Typography variant="h5">]</Typography>
      </Stack>
      {error ? (
        <Typography variant="caption" color="error" sx={{ ml: 1 }}>
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
};

export default IntervalGlobalParameterField;
