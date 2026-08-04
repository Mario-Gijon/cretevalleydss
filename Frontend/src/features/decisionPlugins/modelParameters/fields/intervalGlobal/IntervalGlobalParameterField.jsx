import { Stack, Typography, TextField } from "@mui/material";
import { buildDraftPair } from "./operations/intervalGlobalValues";
import { intervalGlobalParameterFieldSx } from "./styles/IntervalGlobalParameterField.styles";

export const IntervalGlobalParameterField = ({ parameter, value, onChange, disabled = false, error = "" }) => {
  const restrictions = parameter?.restrictions || {};
  const label = parameter?.label || "Interval";
  const currentValues = buildDraftPair(value);
  const min = Number.isFinite(restrictions.min) ? restrictions.min : undefined;
  const max = Number.isFinite(restrictions.max) ? restrictions.max : undefined;

  return (
    <Stack spacing={0.35}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" sx={intervalGlobalParameterFieldSx.label}>{label}:</Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="body2" sx={intervalGlobalParameterFieldSx.bracket}>[</Typography>
          {[0, 1].map((index) => {
            const item = currentValues[index] ?? "";
            const inputLabel = `${label} ${index === 0 ? "lower" : "upper"} bound`;
            return (
              <TextField
                key={index}
                type="number"
                variant="outlined"
                color="secondary"
                size="small"
                value={item ?? ""}
                onChange={(event) => {
                  const next = [...currentValues];
                  next[index] = event.target.value;
                  onChange(next);
                }}
                inputProps={{ "aria-label": inputLabel, min, max, step: "any" }}
                sx={intervalGlobalParameterFieldSx.input}
                disabled={disabled}
                error={Boolean(error)}
              />
            );
          })}
          <Typography variant="body2" sx={intervalGlobalParameterFieldSx.bracket}>]</Typography>
        </Stack>
      </Stack>
      {error ? <Typography variant="caption" color="error">{error}</Typography> : null}
    </Stack>
  );
};

export default IntervalGlobalParameterField;
