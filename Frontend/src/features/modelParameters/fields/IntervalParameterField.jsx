import { Stack, Typography, TextField } from "@mui/material";
import { handleNumberInput } from "../../../utils/handleTwoDecimals";

const ensureLength = (arr, len, filler = "") => {
  const normalized = Array.isArray(arr) ? [...arr] : [];
  if (normalized.length < len) return [...normalized, ...Array(len - normalized.length).fill(filler)];
  if (normalized.length > len) return normalized.slice(0, len);
  return normalized;
};

export const IntervalParameterField = ({
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

  const currentValues = ensureLength(
    paramValues[paramKey] ?? defaultValue ?? [],
    2,
    ""
  );

  return (
    <Stack spacing={1} direction="row" alignItems="center">
      <Typography variant="body1">{paramLabel}:</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h5">[</Typography>
        {currentValues.map((val, index) => (
          <TextField
            color="info"
            key={index}
            type="number"
            size="small"
            value={val}
            onChange={(e) => {
              const newValues = [...currentValues];
              newValues[index] = handleNumberInput(e.target.value);
              setParamValues((prev) => ({
                ...prev,
                [paramKey]: newValues,
              }));
              if (defaultModelParams) setDefaultModelParams(false);
            }}
            inputProps={{
              min: restrictions?.min ?? 0,
              max: restrictions?.max ?? 1,
              step: 0.1,
            }}
            sx={{ width: 80 }}
          />
        ))}
        <Typography variant="h5">]</Typography>
      </Stack>
    </Stack>
  );
};

export default IntervalParameterField;
