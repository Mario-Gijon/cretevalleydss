import { Stack, Typography, TextField } from "@mui/material";
import { handleNumberInput } from "../../../utils/handleTwoDecimals";
import { resolveLeafLengthForParameter } from "../modelParameter.metadata";

const ensureLength = (arr, len, filler = "") => {
  const normalized = Array.isArray(arr) ? [...arr] : [];
  if (normalized.length < len) return [...normalized, ...Array(len - normalized.length).fill(filler)];
  if (normalized.length > len) return normalized.slice(0, len);
  return normalized;
};

export const ArrayParameterField = ({
  parameter,
  paramKey,
  paramLabel,
  paramValues,
  setParamValues,
  defaultModelParams,
  setDefaultModelParams,
  leafCriteria,
}) => {
  const restrictions = parameter?.restrictions || {};
  const defaultValue = parameter?.default;

  const length =
    resolveLeafLengthForParameter(parameter, leafCriteria.length) ??
    restrictions?.length ?? 2;

  const currentValues = ensureLength(
    paramValues[paramKey] ?? defaultValue ?? [],
    length,
    ""
  );

  const isInterval =
    restrictions?.min !== null &&
    restrictions?.max !== null &&
    !restrictions?.sum &&
    resolveLeafLengthForParameter(parameter, leafCriteria.length) === null;

  if (isInterval) {
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
  }

  return (
    <Stack spacing={1} alignItems="flex-start">
      <Typography variant="body1">{paramLabel}:</Typography>
      <Stack direction="row" flexWrap="wrap" gap={2}>
        {currentValues.map((val, index) => (
          <Stack key={index} spacing={0.5} alignItems="center">
            <Typography variant="caption">{leafCriteria[index]?.name ?? `V${index + 1}`}</Typography>
            <TextField
              type="number"
              color="info"
              size="small"
              value={val ?? ""}
              onChange={(e) => {
                const newValues = [...currentValues];
                newValues[index] = handleNumberInput(e.target.value);
                setParamValues((prev) => ({ ...prev, [paramKey]: newValues }));
                if (defaultModelParams) setDefaultModelParams(false);
              }}
              inputProps={{
                min: restrictions?.min ?? undefined,
                max: restrictions?.max ?? undefined,
                step: 0.1,
              }}
              sx={{ width: 80 }}
            />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
};

export default ArrayParameterField;
